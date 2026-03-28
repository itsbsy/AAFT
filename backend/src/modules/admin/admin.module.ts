import { Module } from '@nestjs/common';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersRepository } from './users/admin-users.repository';
import { AdminUsersService } from './users/admin-users.service';

@Module({
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminUsersRepository],
})
export class AdminModule {}
