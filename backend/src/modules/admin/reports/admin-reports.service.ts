import { Injectable } from '@nestjs/common';
import { AdminReportsQueryDto } from './dto/admin-reports-query.dto';
import {
  AdminReportsRepository,
  DateRangeFilter,
} from './admin-reports.repository';

@Injectable()
export class AdminReportsService {
  constructor(private readonly repo: AdminReportsRepository) {}

  async progress(query: AdminReportsQueryDto) {
    const { limit, skip } = this.paginate(query);
    const range = this.parseRange(query);

    const rows = await this.repo.findProgressPage(range, skip, limit);
    return rows.map((r) => ({
      user: r.user,
      unit: r.unit,
      completionPercent: r.completionPercent,
      completed: r.completed,
      lastWatchedSeconds: r.lastWatchedSeconds,
      updatedAt: r.updatedAt,
    }));
  }

  async completions(query: AdminReportsQueryDto) {
    const { limit, skip } = this.paginate(query);
    const range = this.parseRange(query);

    const rows = await this.repo.findCompletionsPage(range, skip, limit);
    return rows.map((c) => ({
      certificateId: c.id,
      verificationCode: c.verificationCode,
      issuedAt: c.issuedAt,
      user: c.user,
      courseRun: c.courseRun,
    }));
  }

  /** proxy “time spent” via last_watched_seconds on video unit progress rows */
  async timeSpent(query: AdminReportsQueryDto) {
    const { limit, skip } = this.paginate(query);
    const range = this.parseRange(query);

    const rows = await this.repo.findTimeSpentPage(range, skip, limit);
    return rows.map((r) => ({
      user: r.user,
      unit: r.unit,
      lastWatchedSeconds: r.lastWatchedSeconds,
      updatedAt: r.updatedAt,
    }));
  }

  // basic pagination for now — can improve with total count later
  private paginate(query: AdminReportsQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const skip = (page - 1) * limit;
    return { limit, skip };
  }

  private parseRange(query: AdminReportsQueryDto): DateRangeFilter | undefined {
    const gte = query.from ? new Date(query.from) : undefined;
    const lte = query.to ? new Date(query.to) : undefined;
    if (!gte && !lte) {
      return undefined;
    }
    return { gte, lte };
  }
}
