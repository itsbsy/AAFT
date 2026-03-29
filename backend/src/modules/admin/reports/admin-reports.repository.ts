import { Injectable } from '@nestjs/common';
import { Prisma, UnitType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type DateRangeFilter = { gte?: Date; lte?: Date };


@Injectable()
export class AdminReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private progressWhere(
    range: DateRangeFilter | undefined,
  ): Prisma.UnitProgressWhereInput {
    if (!range || (!range.gte && !range.lte)) {
      return {};
    }
    return { updatedAt: range };
  }

  countProgress(range: DateRangeFilter | undefined) {
    return this.prisma.unitProgress.count({ where: this.progressWhere(range) });
  }

  findProgressPage(
    range: DateRangeFilter | undefined,
    skip: number,
    take: number,
  ) {
    return this.prisma.unitProgress.findMany({
      where: this.progressWhere(range),
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        unit: { select: { id: true, title: true, type: true } },
      },
    });
  }

  private certificateWhere(
    range: DateRangeFilter | undefined,
  ): Prisma.CertificateWhereInput {
    if (!range || (!range.gte && !range.lte)) {
      return {};
    }
    return { issuedAt: range };
  }

  countCompletions(range: DateRangeFilter | undefined) {
    return this.prisma.certificate.count({
      where: this.certificateWhere(range),
    });
  }

  findCompletionsPage(
    range: DateRangeFilter | undefined,
    skip: number,
    take: number,
  ) {
    return this.prisma.certificate.findMany({
      where: this.certificateWhere(range),
      orderBy: { issuedAt: 'desc' },
      skip,
      take,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        courseRun: {
          select: {
            id: true,
            runName: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
    });
  }

  private timeSpentWhere(
    range: DateRangeFilter | undefined,
  ): Prisma.UnitProgressWhereInput {
    const base: Prisma.UnitProgressWhereInput = {
      unit: { type: UnitType.video },
    };
    if (range && (range.gte || range.lte)) {
      base.updatedAt = range;
    }
    return base;
  }

  countTimeSpent(range: DateRangeFilter | undefined) {
    return this.prisma.unitProgress.count({
      where: this.timeSpentWhere(range),
    });
  }

  findTimeSpentPage(
    range: DateRangeFilter | undefined,
    skip: number,
    take: number,
  ) {
    return this.prisma.unitProgress.findMany({
      where: this.timeSpentWhere(range),
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        unit: { select: { id: true, title: true, type: true } },
      },
    });
  }
}
