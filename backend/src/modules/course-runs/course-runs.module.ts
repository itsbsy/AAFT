import { Module } from '@nestjs/common';
import { CourseRunsController } from './course-runs.controller';
import { CourseRunsRepository } from './course-runs.repository';
import { CourseRunsService } from './course-runs.service';

@Module({
  controllers: [CourseRunsController],
  providers: [CourseRunsService, CourseRunsRepository],
})
export class CourseRunsModule {}
