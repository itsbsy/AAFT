import { UnitType } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsEnum(UnitType)
  type!: UnitType;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;
}
