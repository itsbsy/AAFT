import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentKind, EnrollmentType, Prisma, RoleName } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentsRepository } from './enrollments.repository';
import { BulkEnrollDto } from './dto/bulk-enroll.dto';
import { ListEnrollmentsQueryDto } from './dto/list-enrollments-query.dto';
import { SelfEnrollDto } from './dto/self-enroll.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly repo: EnrollmentsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async listForRun(
    courseRunId: string,
    query: ListEnrollmentsQueryDto,
    actor: JwtPayload,
  ) {
    const run = await this.prisma.courseRun.findUnique({
      where: { id: courseRunId },
      include: { course: { select: { instructorId: true } } },
    });
    if (!run) {
      throw new NotFoundException('Course run not found');
    }
    this.assertInstructorOwnerOrAdmin(run.course.instructorId, actor);

    // basic pagination for now — can improve with total count later
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const skip = (page - 1) * limit;

    return this.repo.findManyByRun(courseRunId, skip, limit);
  }

  async selfEnroll(
    courseRunId: string,
    dto: SelfEnrollDto,
    actor: JwtPayload,
  ) {
    if (actor.role !== RoleName.Student) {
      throw new ForbiddenException('Students only');
    }

    const run = await this.requireRunWithCourse(courseRunId);
    this.assertSelfEnrollAllowed(run);

    const kind = dto.kind ?? EnrollmentKind.free;
    // payment flow not implemented — "paid" is just a label for now
    const existing = await this.repo.findByRunAndUser(courseRunId, actor.userId);
    if (existing?.isActive) {
      throw new ConflictException('Already enrolled');
    }
    if (existing && !existing.isActive) {
      return this.repo.updateActive(courseRunId, actor.userId, {
        isActive: true,
        kind,
      });
    }

    try {
      return await this.repo.create({
        courseRun: { connect: { id: courseRunId } },
        user: { connect: { id: actor.userId } },
        kind,
        isActive: true,
      });
    } catch (e) {
      // race with another request: @@unique(courseRunId, userId) — reconcile instead of 500
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const again = await this.repo.findByRunAndUser(
          courseRunId,
          actor.userId,
        );
        if (again?.isActive) {
          throw new ConflictException('Already enrolled');
        }
        if (again) {
          return this.repo.updateActive(courseRunId, actor.userId, {
            isActive: true,
            kind,
          });
        }
      }
      throw e;
    }
  }

  async selfUnenroll(courseRunId: string, actor: JwtPayload) {
    if (actor.role !== RoleName.Student) {
      throw new ForbiddenException('Students only');
    }

    await this.requireRunWithCourse(courseRunId);

    const existing = await this.repo.findByRunAndUser(courseRunId, actor.userId);
    if (!existing || !existing.isActive) {
      throw new NotFoundException('No active enrollment');
    }

    // soft unenroll — keep row, flip flag
    return this.repo.updateActive(courseRunId, actor.userId, { isActive: false });
  }

  async bulkEnroll(
    courseRunId: string,
    dto: BulkEnrollDto,
    _actor: JwtPayload,
  ) {
    const run = await this.requireRunWithCourse(courseRunId);
    if (!run.isActive) {
      throw new ForbiddenException('Course run is not active');
    }
    if (!run.course.published) {
      throw new ForbiddenException('Course run course is not published');
    }

    const results: { userId: string; status: string }[] = [];

    const distinctIds = [...new Set(dto.userIds)];
    const [users, existingRows] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: distinctIds } },
        select: { id: true },
      }),
      this.prisma.enrollment.findMany({
        where: { courseRunId, userId: { in: distinctIds } },
      }),
    ]);
    const userSet = new Set(users.map((u) => u.id));
    const enrollByUser = new Map(existingRows.map((e) => [e.userId, e]));

    for (const userId of dto.userIds) {
      if (!userSet.has(userId)) {
        results.push({ userId, status: 'skipped_no_user' });
        continue;
      }

      let existing = enrollByUser.get(userId);
      if (existing?.isActive) {
        results.push({ userId, status: 'skipped_duplicate' });
        continue;
      }
      if (existing && !existing.isActive) {
        await this.repo.updateActive(courseRunId, userId, {
          isActive: true,
          kind: dto.kind,
        });
        results.push({ userId, status: 'reactivated' });
        continue;
      }

      try {
        const created = await this.repo.create({
          courseRun: { connect: { id: courseRunId } },
          user: { connect: { id: userId } },
          kind: dto.kind,
          isActive: true,
        });
        enrollByUser.set(userId, created);
        results.push({ userId, status: 'created' });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          const again = await this.repo.findByRunAndUser(courseRunId, userId);
          if (!again) {
            throw e;
          }
          enrollByUser.set(userId, again);
          if (again.isActive) {
            results.push({ userId, status: 'skipped_duplicate' });
          } else {
            await this.repo.updateActive(courseRunId, userId, {
              isActive: true,
              kind: dto.kind,
            });
            results.push({ userId, status: 'reactivated' });
          }
          continue;
        }
        throw e;
      }
    }

    return { courseRunId, results };
  }

  async adminUnenroll(courseRunId: string, userId: string, _actor: JwtPayload) {
    await this.requireRunWithCourse(courseRunId);

    const existing = await this.repo.findByRunAndUser(courseRunId, userId);
    if (!existing || !existing.isActive) {
      throw new NotFoundException('No active enrollment');
    }

    return this.repo.updateActive(courseRunId, userId, { isActive: false });
  }

  private async requireRunWithCourse(courseRunId: string) {
    const run = await this.prisma.courseRun.findUnique({
      where: { id: courseRunId },
      include: { course: true },
    });
    if (!run) {
      throw new NotFoundException('Course run not found');
    }
    return run;
  }

  private assertSelfEnrollAllowed(run: {
    isActive: boolean;
    enrollmentType: EnrollmentType;
    course: { published: boolean };
  }) {
    if (!run.isActive) {
      throw new ForbiddenException('Course run is not active');
    }
    if (!run.course.published) {
      throw new ForbiddenException('Course is not published');
    }
    if (run.enrollmentType === EnrollmentType.closed) {
      throw new ForbiddenException('Enrollment is closed');
    }
    if (run.enrollmentType === EnrollmentType.invite_only) {
      throw new ForbiddenException('Self enrollment not allowed for this run');
    }
    // open / paid run types: still no real payment gate here
  }

  private assertInstructorOwnerOrAdmin(
    instructorId: string,
    actor: JwtPayload,
  ) {
    if (actor.role === RoleName.Admin) {
      return;
    }
    if (
      actor.role === RoleName.Instructor &&
      actor.userId === instructorId
    ) {
      return;
    }
    throw new ForbiddenException('Not allowed');
  }
}
