import { Injectable } from '@nestjs/common';
import { EnrollmentKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByRunAndUser(courseRunId: string, userId: string) {
    return this.prisma.enrollment.findUnique({
      where: {
        courseRunId_userId: { courseRunId, userId },
      },
    });
  }

  create(data: Prisma.EnrollmentCreateInput) {
    return this.prisma.enrollment.create({ data });
  }

  updateActive(
    courseRunId: string,
    userId: string,
    patch: { isActive: boolean; kind?: EnrollmentKind },
  ) {
    return this.prisma.enrollment.update({
      where: { courseRunId_userId: { courseRunId, userId } },
      data: patch,
    });
  }
}
