import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpsertGradingConfigDto } from './dto/upsert-grading-config.dto';
import { GradesService } from './grades.service';

@Controller('course-runs/:courseRunId')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Put('grading-config')
  @Roles(RoleName.Admin, RoleName.Instructor)
  upsertConfig(
    @Param('courseRunId', ParseUUIDPipe) courseRunId: string,
    @Body() dto: UpsertGradingConfigDto,
    @Req() req: Request,
  ) {
    return this.gradesService.upsertGradingConfig(courseRunId, dto, req.user!);
  }

  @Get('enrollments/me/grade')
  getMyBreakdown(
    @Param('courseRunId', ParseUUIDPipe) courseRunId: string,
    @Req() req: Request,
  ) {
    return this.gradesService.getGradeBreakdown(
      courseRunId,
      req.user!.userId,
      req.user!,
    );
  }

  // recalculation is triggered manually here 
  @Post('enrollments/me/grade/recalculate')
  recalculateMine(
    @Param('courseRunId', ParseUUIDPipe) courseRunId: string,
    @Req() req: Request,
  ) {
    return this.gradesService.recalculateMyGrade(courseRunId, req.user!);
  }

  @Get('enrollments/users/:userId/grade')
  @Roles(RoleName.Admin, RoleName.Instructor)
  getUserBreakdown(
    @Param('courseRunId', ParseUUIDPipe) courseRunId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ) {
    return this.gradesService.getGradeBreakdown(courseRunId, userId, req.user!);
  }

  @Post('enrollments/users/:userId/grade/recalculate')
  @Roles(RoleName.Admin, RoleName.Instructor)
  recalculateUser(
    @Param('courseRunId', ParseUUIDPipe) courseRunId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: Request,
  ) {
    return this.gradesService.recalculateUserGrade(courseRunId, userId, req.user!);
  }
}
