import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { CourseRunsService } from './course-runs.service';
import { CloneCourseRunDto } from './dto/clone-course-run.dto';
import { CreateCourseRunDto } from './dto/create-course-run.dto';
import { ListCourseRunsQueryDto } from './dto/list-course-runs-query.dto';

@Controller('course-runs')
@Roles(RoleName.Admin, RoleName.Instructor)
export class CourseRunsController {
  constructor(private readonly courseRunsService: CourseRunsService) {}

  @Post()
  create(@Body() dto: CreateCourseRunDto, @Req() req: Request) {
    return this.courseRunsService.create(dto, req.user!);
  }

  @Post(':id/clone')
  clone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneCourseRunDto,
    @Req() req: Request,
  ) {
    return this.courseRunsService.clone(id, dto, req.user!);
  }

  @Get()
  listByCourse(@Query() query: ListCourseRunsQueryDto, @Req() req: Request) {
    return this.courseRunsService.findByCourse(query.courseId, req.user!);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.courseRunsService.findOne(id, req.user!);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.courseRunsService.remove(id, req.user!);
  }
}
