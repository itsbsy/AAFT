import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SubmitQuizAttemptDto {
  /** questionId -> selected option id(s) */
  @ApiProperty({
    example: { '00000000-0000-4000-8000-000000000001': ['opt-id-1'] },
    description: 'Question UUID keys, string[] values',
  })
  @IsObject()
  answers!: Record<string, string[]>;
}
