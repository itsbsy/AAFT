import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VideoProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserAndUnit(userId: string, unitId: string) {
    return this.prisma.unitProgress.findUnique({
      where: { userId_unitId: { userId, unitId } },
    });
  }

  // using upsert
  upsert(
    userId: string,
    unitId: string,
    data: Pick<
      Prisma.UnitProgressCreateInput,
      'lastWatchedSeconds' | 'completionPercent' | 'completed'
    >,
  ) {
    return this.prisma.unitProgress.upsert({
      where: { userId_unitId: { userId, unitId } },
      create: {
        user: { connect: { id: userId } },
        unit: { connect: { id: unitId } },
        lastWatchedSeconds: data.lastWatchedSeconds,
        completionPercent: data.completionPercent,
        completed: data.completed,
      },
      update: {
        lastWatchedSeconds: data.lastWatchedSeconds,
        completionPercent: data.completionPercent,
        completed: data.completed,
      },
    });
  }

  /** basic aggregation placeholder — real rollups TBD */
  countForUser(userId: string): Promise<number> {
    return this.prisma.unitProgress.count({ where: { userId } });
  }
}
