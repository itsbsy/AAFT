import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GradesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findConfigByCourseRunId(courseRunId: string) {
    return this.prisma.gradingConfig.findUnique({ where: { courseRunId } });
  }

  upsertConfig(data: {
    courseRunId: string;
    weights: Prisma.InputJsonValue;
    passThresholdPercent: number;
  }) {
    return this.prisma.gradingConfig.upsert({
      where: { courseRunId: data.courseRunId },
      create: {
        courseRunId: data.courseRunId,
        weights: data.weights,
        passThresholdPercent: data.passThresholdPercent,
      },
      update: {
        weights: data.weights,
        passThresholdPercent: data.passThresholdPercent,
      },
    });
  }

  /** active enrollment only soft-unenroll means no grade row for students */
  findActiveEnrollment(courseRunId: string, userId: string) {
    return this.prisma.enrollment.findFirst({
      where: { courseRunId, userId, isActive: true },
    });
  }

  findEnrollmentsByUserAndCourse(userId: string, courseId: string) {
    return this.prisma.enrollment.findMany({
      where: {
        userId,
        isActive: true,
        courseRun: { courseId },
      },
    });
  }

  updateEnrollmentGrade(
    enrollmentId: string,
    data: {
      gradeWeighted: number;
      gradePassed: boolean;
      gradeBreakdown: Prisma.InputJsonValue;
    },
  ) {
    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        gradeWeighted: data.gradeWeighted,
        gradePassed: data.gradePassed,
        gradeBreakdown: data.gradeBreakdown,
      },
    });
  }

  findCourseRunWithCourse(courseRunId: string) {
    return this.prisma.courseRun.findUnique({
      where: { id: courseRunId },
      include: { course: true },
    });
  }
}
