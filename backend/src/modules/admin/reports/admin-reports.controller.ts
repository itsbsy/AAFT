import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminReportsService } from './admin-reports.service';
import { AdminReportsQueryDto } from './dto/admin-reports-query.dto';

@ApiTags('admin — reports')
@ApiBearerAuth('access-token')
@Controller('admin/reports')
@Roles(RoleName.Admin)
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get('progress')
  progress(@Query() query: AdminReportsQueryDto) {
    return this.adminReportsService.progress(query);
  }

  @Get('completions')
  completions(@Query() query: AdminReportsQueryDto) {
    return this.adminReportsService.completions(query);
  }

  @Get('time-spent')
  timeSpent(@Query() query: AdminReportsQueryDto) {
    return this.adminReportsService.timeSpent(query);
  }
}
