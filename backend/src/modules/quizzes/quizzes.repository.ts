import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuizzesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findQuizById(id: string) {
    return this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        unit: {
          include: {
            subsection: {
              include: { section: { include: { course: true } } },
            },
          },
        },
      },
    });
  }

  createQuiz(data: Prisma.QuizCreateInput) {
    return this.prisma.quiz.create({ data });
  }

  createQuestion(data: Prisma.QuizQuestionCreateInput) {
    return this.prisma.quizQuestion.create({ data });
  }

  async nextQuestionOrder(quizId: string): Promise<number> {
    const agg = await this.prisma.quizQuestion.aggregate({
      where: { quizId },
      _max: { orderIndex: true },
    });
    return (agg._max.orderIndex ?? -1) + 1;
  }

  countAttempts(quizId: string, userId: string): Promise<number> {
    return this.prisma.quizAttempt.count({ where: { quizId, userId } });
  }

  /** answers stored as JSONB via Prisma Json */
  createAttempt(data: Prisma.QuizAttemptCreateInput) {
    return this.prisma.quizAttempt.create({ data });
  }
}
