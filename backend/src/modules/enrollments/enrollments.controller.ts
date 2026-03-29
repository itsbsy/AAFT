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
import { BulkEnrollDto } from './dto/bulk-enroll.dto';
import { ListEnrollmentsQueryDto } from './dto/list-enrollments-query.dto';
import { SelfEnrollDto } from './dto/self-enroll.dto';
import { EnrollmentsService } from './enrollments.service';

@Controller('course-runs/:courseRunId/enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @Roles(RoleName.Admin, RoleName.Instructor)
  list(
    @Param('courseRunId', ParseUUIDPipe) courseRunId: string,
    @Query() query: ListEnrollmentsQueryDto,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.listForRun(courseRunId, query, req.user!);
  }

  @Post('self')
  @Roles(RoleName.Student)
  selfEnroll(
    @Param('courseRunId', ParseUUIDPipe) courseRunId: string,
    @Body() dto: SelfEnrollDto,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.selfEnroll(courseRunId, dto, req.user!);
  }

  @Delete('self')
  @Roles(RoleName.Student)
  selfUnenroll(
    @Param('courseRunId', ParseUUIDPipe) courseRunId: string,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.selfUnenroll(courseRunId, req.user!);
  }

  @Post('bulk')
  @Roles(RoleName.Admin)
  bulkEnroll(
    @Param('courseRunId', ParseUUIDPipe) courseRunId: string,
    @Body() dto: BulkEnrollDto,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.bulkEnroll(courseRunId, dto, req.user!);
  }

  @Delete('users/:userId')
  @Roles(RoleName.Admin)
  adminUnenroll(
    @Param('courseRunId', ParseUUIDPipe) courseRunId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ) {
    return this.enrollmentsService.adminUnenroll(courseRunId, userId, req.user!);
  }
}
