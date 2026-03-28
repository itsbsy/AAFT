import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { JwtPayload } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CoursesRepository } from './courses.repository';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateSubsectionDto } from './dto/create-subsection.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { PublishCourseDto } from './dto/publish-course.dto';

// hierarchy + deep fetches are simple for now might need optimization later
@Injectable()
export class CoursesService {
  constructor(
    private readonly coursesRepo: CoursesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCourseDto, _actor: JwtPayload) {
    const instructor = await this.prisma.user.findUnique({
      where: { id: dto.instructorId },
    });
    if (!instructor) {
      throw new NotFoundException('Instructor user not found');
    }

    return this.coursesRepo.createCourse({
      title: dto.title,
      description: dto.description,
      published: false,
      instructor: { connect: { id: dto.instructorId } },
    });
  }

  async publish(
    courseId: string,
    dto: PublishCourseDto,
    actor: JwtPayload,
  ) {
    const course = await this.coursesRepo.findCourseById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    this.assertCanPublish(course.instructorId, actor);
    return this.coursesRepo.updateCoursePublished(courseId, dto.published);
  }

  async addSection(courseId: string, dto: CreateSectionDto, actor: JwtPayload) {
    const course = await this.requireCourse(courseId);
    this.assertInstructorOwnerOrAdmin(course.instructorId, actor);

    const orderIndex =
      dto.orderIndex ?? (await this.coursesRepo.nextSectionOrder(courseId));

    return this.coursesRepo.createSection(courseId, dto.title, orderIndex);
  }

  async addSubsection(
    courseId: string,
    sectionId: string,
    dto: CreateSubsectionDto,
    actor: JwtPayload,
  ) {
    const course = await this.requireCourse(courseId);
    this.assertInstructorOwnerOrAdmin(course.instructorId, actor);

    const section = await this.coursesRepo.findSectionInCourse(
      sectionId,
      courseId,
    );
    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const orderIndex =
      dto.orderIndex ?? (await this.coursesRepo.nextSubsectionOrder(sectionId));

    return this.coursesRepo.createSubsection(sectionId, dto.title, orderIndex);
  }

  async addUnit(
    courseId: string,
    sectionId: string,
    subsectionId: string,
    dto: CreateUnitDto,
    actor: JwtPayload,
  ) {
    const course = await this.requireCourse(courseId);
    this.assertInstructorOwnerOrAdmin(course.instructorId, actor);

    const subsection = await this.coursesRepo.findSubsectionInCourse(
      subsectionId,
      sectionId,
      courseId,
    );
    if (!subsection) {
      throw new NotFoundException('Subsection not found');
    }

    const orderIndex =
      dto.orderIndex ?? (await this.coursesRepo.nextUnitOrder(subsectionId));

    // quiz is just a type for now  no quiz logic yet
    return this.coursesRepo.createUnit(
      subsectionId,
      dto.title,
      dto.type,
      orderIndex,
    );
  }

  async getCourse(courseId: string, actor: JwtPayload) {
    const course = await this.coursesRepo.findCourseWithTree(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    this.assertCanView(course, actor);
    return course;
  }

  private async requireCourse(courseId: string) {
    const course = await this.coursesRepo.findCourseById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
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
    throw new ForbiddenException('Not your course');
  }

  private assertCanPublish(instructorId: string, actor: JwtPayload) {
    // same rules as edits for now simple RBAC
    this.assertInstructorOwnerOrAdmin(instructorId, actor);
  }

  private assertCanView(
    course: { published: boolean; instructorId: string },
    actor: JwtPayload,
  ) {
    if (course.published) {
      return;
    }
    if (actor.role === RoleName.Admin) {
      return;
    }
    if (
      actor.role === RoleName.Instructor &&
      actor.userId === course.instructorId
    ) {
      return;
    }
    throw new ForbiddenException('Course not published');
  }
}
