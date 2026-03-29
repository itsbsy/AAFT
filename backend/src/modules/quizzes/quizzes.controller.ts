import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AddQuizQuestionDto } from './dto/add-quiz-question.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizAttemptDto } from './dto/submit-quiz-attempt.dto';
import { QuizzesService } from './quizzes.service';

@ApiTags('quizzes')
@ApiBearerAuth('access-token')
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post('units/:unitId')
  @Roles(RoleName.Admin, RoleName.Instructor)
  createForUnit(
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Body() dto: CreateQuizDto,
    @Req() req: Request,
  ) {
    return this.quizzesService.createForUnit(unitId, dto, req.user!);
  }

  @Get(':quizId')
  getOne(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Req() req: Request,
  ) {
    return this.quizzesService.getQuiz(quizId, req.user!);
  }

  @Post(':quizId/questions')
  @Roles(RoleName.Admin, RoleName.Instructor)
  addQuestion(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: AddQuizQuestionDto,
    @Req() req: Request,
  ) {
    return this.quizzesService.addQuestion(quizId, dto, req.user!);
  }

  @Post(':quizId/attempts')
  submitAttempt(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: SubmitQuizAttemptDto,
    @Req() req: Request,
  ) {
    return this.quizzesService.submitAttempt(quizId, dto, req.user!);
  }
}
