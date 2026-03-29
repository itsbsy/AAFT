import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitType } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.service';
import { GradesService } from '../grades/grades.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertVideoProgressDto } from './dto/upsert-video-progress.dto';
import { VideoProgressRepository } from './video-progress.repository';

const COMPLETE_AT_PERCENT = 90;

@Injectable()
export class VideoProgressService {
  constructor(
    private readonly repo: VideoProgressRepository,
    private readonly prisma: PrismaService,
    private readonly gradesService: GradesService,
  ) {}

  async upsertForUnit(
    unitId: string,
    dto: UpsertVideoProgressDto,
    actor: JwtPayload,
  ) {
    if (
      dto.lastWatchedSeconds === undefined &&
      dto.completionPercent === undefined
    ) {
      throw new BadRequestException(
        'Provide lastWatchedSeconds and/or completionPercent',
      );
    }

    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        subsection: { include: { section: { select: { courseId: true } } } },
      },
    });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    if (unit.type !== UnitType.video) {
      throw new BadRequestException('Progress only tracked for video units');
    }

    const existing = await this.repo.findByUserAndUnit(actor.userId, unitId);
    const lastWatchedSeconds =
      dto.lastWatchedSeconds ?? existing?.lastWatchedSeconds ?? 0;
    const completionPercent =
      dto.completionPercent ?? existing?.completionPercent ?? 0;

    // completion logic is simple — single threshold, no partial credit rules
    const completed = completionPercent >= COMPLETE_AT_PERCENT;

    const saved = await this.repo.upsert(actor.userId, unitId, {
      lastWatchedSeconds,
      completionPercent,
      completed,
    });

    const courseId = unit.subsection.section.courseId;
    // grade recalculation is triggered manually here so pass/certificate can update after video progress
    await this.gradesService.recalculateForUserOnCourse(actor.userId, courseId);

    return saved;
  }

  aggregatePlaceholder(actor: JwtPayload) {
    // basic aggregation placeholder — swap for course/run rollups later
    return this.repo.countForUser(actor.userId).then((trackedUnits) => ({
      placeholder: true,
      userId: actor.userId,
      trackedUnits,
      note: 'No course/run breakdown yet',
    }));
  }
}
