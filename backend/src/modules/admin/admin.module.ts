import { Module } from '@nestjs/common';
import { AdminReportsController } from './reports/admin-reports.controller';
import { AdminReportsRepository } from './reports/admin-reports.repository';
import { AdminReportsService } from './reports/admin-reports.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersRepository } from './users/admin-users.repository';
import { AdminUsersService } from './users/admin-users.service';

@Module({
  controllers: [AdminUsersController, AdminReportsController],
  providers: [
    AdminUsersService,
    AdminUsersRepository,
    AdminReportsService,
    AdminReportsRepository,
  ],
})
export class AdminModule {}
