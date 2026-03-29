import { QuizQuestionMode } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { QuizOptionItemDto } from './quiz-option.dto';

export class AddQuizQuestionDto {
  @IsString()
  @MinLength(1)
  prompt!: string;

  @IsEnum(QuizQuestionMode)
  mode!: QuizQuestionMode;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => QuizOptionItemDto)
  options!: QuizOptionItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  correctOptionIds!: string[];
}
