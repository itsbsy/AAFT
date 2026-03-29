import { IsObject } from 'class-validator';

export class SubmitQuizAttemptDto {
  /** questionId -> selected option id(s) */
  @IsObject()
  answers!: Record<string, string[]>;
}
