import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CourseRunsRepository } from './course-runs.repository';
import { CloneCourseRunDto } from './dto/clone-course-run.dto';
import { CreateCourseRunDto } from './dto/create-course-run.dto';
import { ListCourseRunsQueryDto } from './dto/list-course-runs-query.dto';

// validation is minimal — dates/order/price rules can tighten later
@Injectable()
export class CourseRunsService {
  constructor(
    private readonly repo: CourseRunsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCourseRunDto, actor: JwtPayload) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    this.assertPublished(course);
    this.assertInstructorOwnerOrAdmin(course.instructorId, actor);

    const data: Prisma.CourseRunCreateInput = {
      runName: dto.runName,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      enrollmentType: dto.enrollmentType,
      price: dto.price,
      isActive: dto.isActive ?? true,
      course: { connect: { id: dto.courseId } },
    };

    return this.repo.create(data);
  }

  async clone(id: string, dto: CloneCourseRunDto, actor: JwtPayload) {
    const source = await this.repo.findById(id);
    if (!source) {
      throw new NotFoundException('Course run not found');
    }
    this.assertPublished(source.course);
    this.assertInstructorOwnerOrAdmin(source.course.instructorId, actor);

    // clone logic is basic copy — no enrollments, no version history
    const runName =
      dto.runName?.trim() ||
      `${source.runName} (copy)`;

    const data: Prisma.CourseRunCreateInput = {
      runName,
      startDate: source.startDate,
      endDate: source.endDate,
      enrollmentType: source.enrollmentType,
      price: source.price,
      isActive: source.isActive,
      course: { connect: { id: source.courseId } },
    };

    return this.repo.create(data);
  }

  async findOne(id: string, actor: JwtPayload) {
    const run = await this.repo.findById(id);
    if (!run) {
      throw new NotFoundException('Course run not found');
    }
    this.assertCanViewRun(run.course, actor);
    return run;
  }

  async findByCourse(query: ListCourseRunsQueryDto, actor: JwtPayload) {
    const { courseId, page, limit } = query;
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    this.assertInstructorOwnerOrAdmin(course.instructorId, actor);
    // basic pagination for now 
    const p = page && page > 0 ? page : 1;
    const l = limit && limit > 0 ? Math.min(limit, 100) : 10;
    const skip = (p - 1) * l;
    return this.repo.findManyByCourseId(courseId, skip, l);
  }

  async remove(id: string, actor: JwtPayload) {
    const run = await this.repo.findById(id);
    if (!run) {
      throw new NotFoundException('Course run not found');
    }
    this.assertInstructorOwnerOrAdmin(run.course.instructorId, actor);

    const n = await this.repo.enrollmentCount(id);
    // any enrollment row blocks delete (FK) — includes inactive / soft-unenrolled
    if (n > 0) {
      throw new ConflictException('Cannot delete: enrollments exist');
    }

    return this.repo.delete(id);
  }

  private assertPublished(course: { published: boolean }) {
    if (!course.published) {
      throw new BadRequestException('Course must be published');
    }
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
    throw new ForbiddenException('Not allowed for this course');
  }

  private assertCanViewRun(
    course: { published: boolean; instructorId: string },
    actor: JwtPayload,
  ) {
    if (course.published) {
      return;
    }
    this.assertInstructorOwnerOrAdmin(course.instructorId, actor);
  }
}
