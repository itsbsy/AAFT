import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateSectionDto } from './dto/create-section.dto';
import { CreateSubsectionDto } from './dto/create-subsection.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { PublishCourseDto } from './dto/publish-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(RoleName.Admin)
  create(@Body() dto: CreateCourseDto, @Req() req: Request) {
    return this.coursesService.create(dto, req.user!);
  }

  @Patch(':courseId/publish')
  @Roles(RoleName.Admin, RoleName.Instructor)
  publish(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: PublishCourseDto,
    @Req() req: Request,
  ) {
    return this.coursesService.publish(courseId, dto, req.user!);
  }

  @Get(':courseId')
  getOne(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Req() req: Request,
  ) {
    return this.coursesService.getCourse(courseId, req.user!);
  }

  @Post(':courseId/sections')
  @Roles(RoleName.Admin, RoleName.Instructor)
  addSection(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateSectionDto,
    @Req() req: Request,
  ) {
    return this.coursesService.addSection(courseId, dto, req.user!);
  }

  @Post(':courseId/sections/:sectionId/subsections')
  @Roles(RoleName.Admin, RoleName.Instructor)
  addSubsection(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateSubsectionDto,
    @Req() req: Request,
  ) {
    return this.coursesService.addSubsection(
      courseId,
      sectionId,
      dto,
      req.user!,
    );
  }

  @Post(
    ':courseId/sections/:sectionId/subsections/:subsectionId/units',
  )
  @Roles(RoleName.Admin, RoleName.Instructor)
  addUnit(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('subsectionId', ParseUUIDPipe) subsectionId: string,
    @Body() dto: CreateUnitDto,
    @Req() req: Request,
  ) {
    return this.coursesService.addUnit(
      courseId,
      sectionId,
      subsectionId,
      dto,
      req.user!,
    );
  }
}
