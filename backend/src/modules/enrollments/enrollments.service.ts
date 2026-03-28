import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentKind, EnrollmentType, RoleName } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsRepository } from './enrollments.repository';
import { BulkEnrollDto } from './dto/bulk-enroll.dto';
import { SelfEnrollDto } from './dto/self-enroll.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly repo: EnrollmentsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async selfEnroll(
    courseRunId: string,
    dto: SelfEnrollDto,
    actor: JwtPayload,
  ) {
    if (actor.role !== RoleName.Student) {
      throw new ForbiddenException('Students only');
    }

    const run = await this.requireRunWithCourse(courseRunId);
    this.assertSelfEnrollAllowed(run);

    const kind = dto.kind ?? EnrollmentKind.free;
    // payment flow not implemented — "paid" is just a label for now
    const existing = await this.repo.findByRunAndUser(courseRunId, actor.userId);
    if (existing?.isActive) {
      throw new ConflictException('Already enrolled');
    }
    if (existing && !existing.isActive) {
      return this.repo.updateActive(courseRunId, actor.userId, {
        isActive: true,
        kind,
      });
    }

    return this.repo.create({
      courseRun: { connect: { id: courseRunId } },
      user: { connect: { id: actor.userId } },
      kind,
      isActive: true,
    });
  }

  async selfUnenroll(courseRunId: string, actor: JwtPayload) {
    if (actor.role !== RoleName.Student) {
      throw new ForbiddenException('Students only');
    }

    await this.requireRunWithCourse(courseRunId);

    const existing = await this.repo.findByRunAndUser(courseRunId, actor.userId);
    if (!existing || !existing.isActive) {
      throw new NotFoundException('No active enrollment');
    }

    // soft unenroll — keep row, flip flag
    return this.repo.updateActive(courseRunId, actor.userId, { isActive: false });
  }

  async bulkEnroll(
    courseRunId: string,
    dto: BulkEnrollDto,
    _actor: JwtPayload,
  ) {
    const run = await this.requireRunWithCourse(courseRunId);
    if (!run.isActive) {
      throw new ForbiddenException('Course run is not active');
    }
    if (!run.course.published) {
      throw new ForbiddenException('Course run course is not published');
    }

    const results: { userId: string; status: string }[] = [];

    // bulk enroll is naive loop — no transaction batching yet
    for (const userId of dto.userIds) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        results.push({ userId, status: 'skipped_no_user' });
        continue;
      }

      const existing = await this.repo.findByRunAndUser(courseRunId, userId);
      if (existing?.isActive) {
        results.push({ userId, status: 'skipped_duplicate' });
        continue;
      }
      if (existing && !existing.isActive) {
        await this.repo.updateActive(courseRunId, userId, {
          isActive: true,
          kind: dto.kind,
        });
        results.push({ userId, status: 'reactivated' });
        continue;
      }

      await this.repo.create({
        courseRun: { connect: { id: courseRunId } },
        user: { connect: { id: userId } },
        kind: dto.kind,
        isActive: true,
      });
      results.push({ userId, status: 'created' });
    }

    return { courseRunId, results };
  }

  async adminUnenroll(courseRunId: string, userId: string, _actor: JwtPayload) {
    await this.requireRunWithCourse(courseRunId);

    const existing = await this.repo.findByRunAndUser(courseRunId, userId);
    if (!existing || !existing.isActive) {
      throw new NotFoundException('No active enrollment');
    }

    return this.repo.updateActive(courseRunId, userId, { isActive: false });
  }

  private async requireRunWithCourse(courseRunId: string) {
    const run = await this.prisma.courseRun.findUnique({
      where: { id: courseRunId },
      include: { course: true },
    });
    if (!run) {
      throw new NotFoundException('Course run not found');
    }
    return run;
  }

  private assertSelfEnrollAllowed(run: {
    isActive: boolean;
    enrollmentType: EnrollmentType;
    course: { published: boolean };
  }) {
    if (!run.isActive) {
      throw new ForbiddenException('Course run is not active');
    }
    if (!run.course.published) {
      throw new ForbiddenException('Course is not published');
    }
    if (run.enrollmentType === EnrollmentType.closed) {
      throw new ForbiddenException('Enrollment is closed');
    }
    if (run.enrollmentType === EnrollmentType.invite_only) {
      throw new ForbiddenException('Self enrollment not allowed for this run');
    }
    // open / paid run types: still no real payment gate here
  }
}
