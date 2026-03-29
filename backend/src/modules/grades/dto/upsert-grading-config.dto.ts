import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min, ValidateNested } from 'class-validator';

export class GradeWeightsDto {
  @ApiProperty({ minimum: 0, maximum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  video!: number;

  @ApiProperty({ minimum: 0, maximum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  quiz!: number;
}

export class UpsertGradingConfigDto {
  @ApiProperty({ type: GradeWeightsDto })
  @ValidateNested()
  @Type(() => GradeWeightsDto)
  weights!: GradeWeightsDto;

  @ApiProperty({ description: '0–100, weighted score must be >= this to pass' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  passThresholdPercent!: number;
}
