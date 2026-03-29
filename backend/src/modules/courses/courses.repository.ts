import { Injectable } from '@nestjs/common';
import { Prisma, UnitType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** hierarchy might need optimization later */
@Injectable()
export class CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createCourse(data: Prisma.CourseCreateInput) {
    return this.prisma.course.create({ data });
  }

  findCourseById(id: string) {
    return this.prisma.course.findUnique({ where: { id } });
  }

  findManyCourses(where: Prisma.CourseWhereInput, skip: number, take: number) {
    return this.prisma.course.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        published: true,
        instructorId: true,
        createdAt: true,
      },
    });
  }

  findCourseWithTree(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            subsections: {
              orderBy: { orderIndex: 'asc' },
              include: {
                units: { orderBy: { orderIndex: 'asc' } },
              },
            },
          },
        },
      },
    });
  }

  updateCoursePublished(id: string, published: boolean) {
    return this.prisma.course.update({
      where: { id },
      data: { published },
    });
  }

  async nextSectionOrder(courseId: string): Promise<number> {
    const agg = await this.prisma.section.aggregate({
      where: { courseId },
      _max: { orderIndex: true },
    });
    return (agg._max.orderIndex ?? -1) + 1;
  }

  createSection(courseId: string, title: string, orderIndex: number) {
    return this.prisma.section.create({
      data: { title, orderIndex, course: { connect: { id: courseId } } },
    });
  }

  findSectionInCourse(sectionId: string, courseId: string) {
    return this.prisma.section.findFirst({
      where: { id: sectionId, courseId },
    });
  }

  async nextSubsectionOrder(sectionId: string): Promise<number> {
    const agg = await this.prisma.subsection.aggregate({
      where: { sectionId },
      _max: { orderIndex: true },
    });
    return (agg._max.orderIndex ?? -1) + 1;
  }

  createSubsection(sectionId: string, title: string, orderIndex: number) {
    return this.prisma.subsection.create({
      data: { title, orderIndex, section: { connect: { id: sectionId } } },
    });
  }

  findSubsectionInCourse(
    subsectionId: string,
    sectionId: string,
    courseId: string,
  ) {
    return this.prisma.subsection.findFirst({
      where: {
        id: subsectionId,
        sectionId,
        section: { courseId },
      },
    });
  }

  async nextUnitOrder(subsectionId: string): Promise<number> {
    const agg = await this.prisma.unit.aggregate({
      where: { subsectionId },
      _max: { orderIndex: true },
    });
    return (agg._max.orderIndex ?? -1) + 1;
  }

  createUnit(
    subsectionId: string,
    title: string,
    type: UnitType,
    orderIndex: number,
  ) {
    return this.prisma.unit.create({
      data: {
        title,
        type,
        orderIndex,
        subsection: { connect: { id: subsectionId } },
      },
    });
  }
}
