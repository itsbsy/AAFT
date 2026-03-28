import { Controller, Get } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from './decorators/roles.decorator';

/** dummy routes to try RBAC **/
@Controller('rbac-demo')
export class RbacDemoController {
  @Get('admin')
  @Roles(RoleName.Admin)
  adminOnly() {
    return { message: 'admin ok' };
  }

  @Get('instructor')
  @Roles(RoleName.Instructor)
  instructorOnly() {
    return { message: 'instructor ok' };
  }

  @Get('student')
  @Roles(RoleName.Student)
  studentOnly() {
    return { message: 'student ok' };
  }

  @Get('staff')
  @Roles(RoleName.Admin, RoleName.Instructor)
  staff() {
    return { message: 'admin or instructor ok' };
  }
}
