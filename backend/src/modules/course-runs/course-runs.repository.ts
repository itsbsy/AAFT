import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseRunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CourseRunCreateInput) {
    return this.prisma.courseRun.create({
      data,
      include: { course: { select: { id: true, title: true, published: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.courseRun.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true, published: true, instructorId: true },
        },
      },
    });
  }

  findManyByCourseId(courseId: string) {
    return this.prisma.courseRun.findMany({
      where: { courseId },
      orderBy: { startDate: 'desc' },
      include: {
        course: {
          select: { id: true, title: true, published: true, instructorId: true },
        },
      },
    });
  }

  enrollmentCount(courseRunId: string): Promise<number> {
    return this.prisma.enrollment.count({ where: { courseRunId } });
  }

  delete(id: string) {
    return this.prisma.courseRun.delete({ where: { id } });
  }
}
