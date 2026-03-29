import { Type } from 'class-transformer';
import { IsNumber, Max, Min, ValidateNested } from 'class-validator';

export class GradeWeightsDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  video!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  quiz!: number;
}

export class UpsertGradingConfigDto {
  @ValidateNested()
  @Type(() => GradeWeightsDto)
  weights!: GradeWeightsDto;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  passThresholdPercent!: number;
}
