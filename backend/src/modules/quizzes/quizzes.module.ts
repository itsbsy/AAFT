import { Module } from '@nestjs/common';
import { GradesModule } from '../grades/grades.module';
import { QuizzesController } from './quizzes.controller';
import { QuizzesRepository } from './quizzes.repository';
import { QuizzesService } from './quizzes.service';

@Module({
  imports: [GradesModule],
  controllers: [QuizzesController],
  providers: [QuizzesService, QuizzesRepository],
})
export class QuizzesModule {}
