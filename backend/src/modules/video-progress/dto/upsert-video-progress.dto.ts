import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpsertVideoProgressDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lastWatchedSeconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  completionPercent?: number;
}
