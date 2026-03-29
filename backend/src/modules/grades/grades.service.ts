import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName, UnitType } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';
import { UpsertGradingConfigDto } from './dto/upsert-grading-config.dto';
import { GradesRepository } from './grades.repository';

type FlatUnit = {
  id: string;
  title: string;
  type: UnitType;
  quizId: string | null;
};

const DEFAULT_WEIGHTS = { video: 0.5, quiz: 0.5 };
const DEFAULT_PASS_THRESHOLD = 60;

@Injectable()
export class GradesService {
  constructor(
    private readonly repo: GradesRepository,
    private readonly prisma: PrismaService,
    private readonly certificatesService: CertificatesService,
  ) {}

  async upsertGradingConfig(
    courseRunId: string,
    dto: UpsertGradingConfigDto,
    actor: JwtPayload,
  ) {
    const run = await this.repo.findCourseRunWithCourse(courseRunId);
    if (!run) {
      throw new NotFoundException('Course run not found');
    }
    this.assertInstructorOwnerOrAdmin(run.course.instructorId, actor);

    const weights = {
      video: dto.weights.video,
      quiz: dto.weights.quiz,
    } as Prisma.InputJsonValue;

    return this.repo.upsertConfig({
      courseRunId,
      weights,
      passThresholdPercent: dto.passThresholdPercent,
    });
  }

  async getGradeBreakdown(
    courseRunId: string,
    targetUserId: string,
    actor: JwtPayload,
  ) {
    await this.assertCanViewGrade(courseRunId, targetUserId, actor);

    const enrollment = await this.repo.findActiveEnrollment(
      courseRunId,
      targetUserId,
    );
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return {
      enrollmentId: enrollment.id,
      courseRunId,
      userId: targetUserId,
      gradeWeighted: enrollment.gradeWeighted,
      gradePassed: enrollment.gradePassed,
      breakdown: enrollment.gradeBreakdown,
    };
  }

  async recalculateMyGrade(courseRunId: string, actor: JwtPayload) {
    return this.recalculateForUser(courseRunId, actor.userId, actor);
  }

  async recalculateUserGrade(
    courseRunId: string,
    userId: string,
    actor: JwtPayload,
  ) {
    return this.recalculateForUser(courseRunId, userId, actor);
  }

  /**
   * Called after quiz / video progress (and manual grade endpoints).
   * grade recalculation is triggered manually here — one row per course run the user is active in
   */
  async recalculateForUserOnCourse(userId: string, courseId: string) {
    const rows = await this.repo.findEnrollmentsByUserAndCourse(userId, courseId);
    for (const e of rows) {
      await this.recalculateEnrollmentById(e.id);
    }
  }

  private async recalculateForUser(
    courseRunId: string,
    userId: string,
    actor: JwtPayload,
  ) {
    await this.assertCanViewGrade(courseRunId, userId, actor);
    const enrollment = await this.repo.findActiveEnrollment(courseRunId, userId);
    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }
    return this.recalculateEnrollmentById(enrollment.id);
  }

  private async recalculateEnrollmentById(enrollmentId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        courseRun: { include: { course: true, gradingConfig: true } },
      },
    });
    if (!enrollment?.isActive) {
      throw new NotFoundException('Enrollment not found');
    }

    const courseId = enrollment.courseRun.courseId;
    const units = await this.listCourseUnits(courseId);
    const videoUnits = units.filter((u) => u.type === UnitType.video);
    const quizUnits = units.filter((u) => u.type === UnitType.quiz);

    const cfg = enrollment.courseRun.gradingConfig;
    const passThreshold =
      cfg?.passThresholdPercent ?? DEFAULT_PASS_THRESHOLD;
    const rawWeights = this.parseWeights(cfg?.weights);

    const { wVideo, wQuiz } = this.normalizeWeights(
      rawWeights.video,
      rawWeights.quiz,
      videoUnits.length > 0,
      quizUnits.length > 0,
    );

    const videoDetails = await this.buildVideoDetails(
      enrollment.userId,
      videoUnits,
    );
    const quizDetails = await this.buildQuizDetails(enrollment.userId, quizUnits);

    const videoAvg = averageOrZero(videoDetails.map((d) => d.completionPercent));
    const quizAvg = averageOrZero(quizDetails.map((d) => d.bestScorePercent));

    // weighted score — simple linear combo, no partial credit across categories
    const weightedScore = videoAvg * wVideo + quizAvg * wQuiz;
    const passed = weightedScore >= passThreshold;

    const breakdown = {
      weights: { video: wVideo, quiz: wQuiz },
      passThresholdPercent: passThreshold,
      videoAvg,
      quizAvg,
      weightedScore,
      passed,
      videos: videoDetails,
      quizzes: quizDetails,
      recalculatedAt: new Date().toISOString(),
    } as Prisma.InputJsonValue;

    const updated = await this.repo.updateEnrollmentGrade(enrollment.id, {
      gradeWeighted: weightedScore,
      gradePassed: passed,
      gradeBreakdown: breakdown,
    });

    // certificate generation is simple sync logic — issued once when pass flips true
    await this.certificatesService.issueForPassedEnrollment(passed, {
      enrollmentId: enrollment.id,
      userId: enrollment.userId,
      courseRunId: enrollment.courseRunId,
      courseTitle: enrollment.courseRun.course.title,
      runName: enrollment.courseRun.runName,
      recipientFirstName: enrollment.user.firstName,
      recipientLastName: enrollment.user.lastName,
    });

    return updated;
  }

  private parseWeights(json: Prisma.JsonValue | null | undefined): {
    video: number;
    quiz: number;
  } {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return { ...DEFAULT_WEIGHTS };
    }
    const o = json as Record<string, unknown>;
    const video = Number(o['video']);
    const quiz = Number(o['quiz']);
    if (!Number.isFinite(video) || !Number.isFinite(quiz)) {
      return { ...DEFAULT_WEIGHTS };
    }
    return { video, quiz };
  }

  private normalizeWeights(
    wVideo: number,
    wQuiz: number,
    hasVideo: boolean,
    hasQuiz: boolean,
  ) {
    if (!hasVideo && !hasQuiz) {
      return { wVideo: 0, wQuiz: 0 };
    }
    if (!hasVideo) {
      return { wVideo: 0, wQuiz: 1 };
    }
    if (!hasQuiz) {
      return { wVideo: 1, wQuiz: 0 };
    }
    const sum = wVideo + wQuiz;
    if (sum <= 0) {
      return { wVideo: 0.5, wQuiz: 0.5 };
    }
    return { wVideo: wVideo / sum, wQuiz: wQuiz / sum };
  }

  private async listCourseUnits(courseId: string): Promise<FlatUnit[]> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            subsections: {
              orderBy: { orderIndex: 'asc' },
              include: {
                units: {
                  orderBy: { orderIndex: 'asc' },
                  include: { quiz: { select: { id: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!course) {
      return [];
    }
    const out: FlatUnit[] = [];
    for (const s of course.sections) {
      for (const sub of s.subsections) {
        for (const u of sub.units) {
          out.push({
            id: u.id,
            title: u.title,
            type: u.type,
            quizId: u.quiz?.id ?? null,
          });
        }
      }
    }
    return out;
  }

  private async buildVideoDetails(userId: string, units: FlatUnit[]) {
    if (units.length === 0) {
      return [];
    }
    const unitIds = units.map((u) => u.id);
    const progressRows = await this.prisma.unitProgress.findMany({
      where: { userId, unitId: { in: unitIds } },
    });
    const byUnit = new Map(progressRows.map((p) => [p.unitId, p]));
    return units.map((u) => ({
      unitId: u.id,
      title: u.title,
      completionPercent: byUnit.get(u.id)?.completionPercent ?? 0,
    }));
  }

  private async buildQuizDetails(userId: string, units: FlatUnit[]) {
    const quizIds = units.map((u) => u.quizId).filter((id): id is string => !!id);
    const bestByQuiz = new Map<string, number>();
    if (quizIds.length > 0) {
      const groups = await this.prisma.quizAttempt.groupBy({
        by: ['quizId'],
        where: { userId, quizId: { in: quizIds } },
        _max: { scorePercent: true },
      });
      for (const g of groups) {
        bestByQuiz.set(g.quizId, g._max.scorePercent ?? 0);
      }
    }
    return units.map((u) => ({
      unitId: u.id,
      title: u.title,
      quizId: u.quizId,
      bestScorePercent: u.quizId ? (bestByQuiz.get(u.quizId) ?? 0) : 0,
    }));
  }

  private assertInstructorOwnerOrAdmin(
    instructorId: string,
    actor: JwtPayload,
  ) {
    if (actor.role === RoleName.Admin) {
      return;
    }
    if (
      actor.role === RoleName.Instructor &&
      actor.userId === instructorId
    ) {
      return;
    }
    throw new ForbiddenException('Not allowed for this course run');
  }

  private async assertCanViewGrade(
    courseRunId: string,
    targetUserId: string,
    actor: JwtPayload,
  ) {
    const run = await this.repo.findCourseRunWithCourse(courseRunId);
    if (!run) {
      throw new NotFoundException('Course run not found');
    }
    if (actor.userId === targetUserId) {
      return;
    }
    this.assertInstructorOwnerOrAdmin(run.course.instructorId, actor);
  }
}

function averageOrZero(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}
