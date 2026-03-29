import { EnrollmentKind } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsUUID } from 'class-validator';

export class BulkEnrollDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds!: string[];

  @ApiProperty({ enum: EnrollmentKind })
  @IsEnum(EnrollmentKind)
  kind!: EnrollmentKind;
}
