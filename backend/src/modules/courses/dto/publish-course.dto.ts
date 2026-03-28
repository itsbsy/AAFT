import { IsBoolean } from 'class-validator';

export class PublishCourseDto {
  @IsBoolean()
  published!: boolean;
}
