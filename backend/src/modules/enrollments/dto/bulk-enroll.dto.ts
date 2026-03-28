import { EnrollmentKind } from '@prisma/client';
import { ArrayMinSize, IsArray, IsEnum, IsUUID } from 'class-validator';

export class BulkEnrollDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds!: string[];

  @IsEnum(EnrollmentKind)
  kind!: EnrollmentKind;
}
