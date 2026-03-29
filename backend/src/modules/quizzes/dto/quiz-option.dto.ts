import { IsString, IsUUID, MinLength } from 'class-validator';

export class QuizOptionItemDto {
  @IsUUID()
  id!: string;

  @IsString()
  @MinLength(1)
  text!: string;
}
