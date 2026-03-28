import { EnrollmentKind } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class SelfEnrollDto {
  @IsOptional()
  @IsEnum(EnrollmentKind)
  kind?: EnrollmentKind;
}
