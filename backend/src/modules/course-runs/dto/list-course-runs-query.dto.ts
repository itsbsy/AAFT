import { IsUUID } from 'class-validator';

export class ListCourseRunsQueryDto {
  @IsUUID()
  courseId!: string;
}
