import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class PublishCourseDto {
  @ApiProperty()
  @Type(() => Boolean)
  @IsBoolean()
  published!: boolean;
}
