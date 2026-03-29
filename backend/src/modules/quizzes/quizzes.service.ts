import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QuizQuestionMode, RoleName, UnitType } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddQuizQuestionDto } from './dto/add-quiz-question.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { GradesService } from '../grades/grades.service';
import { QuizzesRepository } from './quizzes.repository';

type QuizWithRelations = NonNullable<
  Awaited<ReturnType<QuizzesRepository['findQuizById']>>
>;

@Injectable()
export class QuizzesService {
  constructor(
    private readonly repo: QuizzesRepository,
    private readonly prisma: PrismaService,
    private readonly gradesService: GradesService,
  ) {}

  async createForUnit(unitId: string, dto: CreateQuizDto, actor: JwtPayload) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        subsection: { include: { section: { include: { course: true } } } },
        quiz: true,
      },
    });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    if (unit.type !== UnitType.quiz) {
      throw new BadRequestException('Unit must be of type quiz');
    }
    if (unit.quiz) {
      throw new ConflictException('Quiz already exists for this unit');
    }

    const instructorId = unit.subsection.section.course.instructorId;
    this.assertInstructorOwnerOrAdmin(instructorId, actor);

    return this.repo.createQuiz({
      title: dto.title,
      maxAttempts: dto.maxAttempts,
      unit: { connect: { id: unitId } },
    });
  }

  async addQuestion(
    quizId: string,
    dto: AddQuizQuestionDto,
    actor: JwtPayload,
  ) {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    const instructorId = quiz.unit.subsection.section.course.instructorId;
    this.assertInstructorOwnerOrAdmin(instructorId, actor);

    this.validateQuestionPayload(dto);

    const orderIndex = await this.repo.nextQuestionOrder(quizId);

    return this.repo.createQuestion({
      prompt: dto.prompt,
      mode: dto.mode,
      orderIndex,
      options: dto.options as unknown as Prisma.InputJsonValue,
      correctOptionIds: dto.correctOptionIds as unknown as Prisma.InputJsonValue,
      quiz: { connect: { id: quizId } },
    });
  }

  async getQuiz(quizId: string, actor: JwtPayload) {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const instructorId = quiz.unit.subsection.section.course.instructorId;
    const showCorrect = this.canManageQuiz(instructorId, actor);

    return {
      id: quiz.id,
      unitId: quiz.unitId,
      title: quiz.title,
      maxAttempts: quiz.maxAttempts,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        orderIndex: q.orderIndex,
        mode: q.mode,
        options: q.options,
        ...(showCorrect ? { correctOptionIds: q.correctOptionIds } : {}),
      })),
    };
  }

  async submitAttempt(
    quizId: string,
    dto: SubmitQuizAttemptDto,
    actor: JwtPayload,
  ) {
    const quiz = await this.repo.findQuizById(quizId);
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const used = await this.repo.countAttempts(quizId, actor.userId);
    if (used >= quiz.maxAttempts) {
      throw new ConflictException('Max attempts reached');
    }

    const answersJson = dto.answers as Prisma.InputJsonValue;

    // scoring logic is basic — whole question only, no partial credit
    const scorePercent = this.scoreQuiz(quiz.questions, dto.answers);

    const attempt = await this.repo.createAttempt({
      quiz: { connect: { id: quizId } },
      user: { connect: { id: actor.userId } },
      answers: answersJson,
      scorePercent,
    });

    const courseId = quiz.unit.subsection.section.course.id;
    // grade recalculation is triggered manually here (no event bus yet)
    await this.gradesService.recalculateForUserOnCourse(actor.userId, courseId);

    return {
      id: attempt.id,
      scorePercent: attempt.scorePercent,
      attemptsUsed: used + 1,
      maxAttempts: quiz.maxAttempts,
    };
  }

  private scoreQuiz(
    questions: QuizWithRelations['questions'],
    answers: Record<string, string[]>,
  ): number {
    if (questions.length === 0) {
      return 100;
    }
    let correct = 0;
    for (const q of questions) {
      const expected = this.asStringArray(q.correctOptionIds);
      const picked = answers[q.id] ?? [];
      if (this.sameSet(expected, picked)) {
        correct += 1;
      }
    }
    return (correct / questions.length) * 100;
  }

  private asStringArray(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((x) => String(x));
  }

  private sameSet(a: string[], b: string[]): boolean {
    const ua = [...new Set(a)].sort();
    const ub = [...new Set(b)].sort();
    return ua.length === ub.length && ua.every((v, i) => v === ub[i]);
  }

  private validateQuestionPayload(dto: AddQuizQuestionDto) {
    const optionIds = new Set(dto.options.map((o) => o.id));
    if (optionIds.size !== dto.options.length) {
      throw new BadRequestException('Option ids must be unique');
    }
    for (const id of dto.correctOptionIds) {
      if (!optionIds.has(id)) {
        throw new BadRequestException(
          `correctOptionIds must reference option ids: unknown "${id}"`,
        );
      }
    }
    if (dto.mode === QuizQuestionMode.single && dto.correctOptionIds.length !== 1) {
      throw new BadRequestException('Single mode requires exactly one correct option');
    }
  }

  private canManageQuiz(instructorId: string, actor: JwtPayload): boolean {
    if (actor.role === RoleName.Admin) {
      return true;
    }
    return actor.role === RoleName.Instructor && actor.userId === instructorId;
  }

  private assertInstructorOwnerOrAdmin(
    instructorId: string,
    actor: JwtPayload,
  ) {
    if (!this.canManageQuiz(instructorId, actor)) {
      throw new ForbiddenException('Not allowed for this course');
    }
  }
}
