import { IsOptional, IsString, MinLength } from 'class-validator';

export class CloneCourseRunDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  runName?: string;
}
