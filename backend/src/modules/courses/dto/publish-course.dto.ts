import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class PublishCourseDto {
  @Type(() => Boolean)
  @IsBoolean()
  published!: boolean;
}
