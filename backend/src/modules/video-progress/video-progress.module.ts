import { Module } from '@nestjs/common';
import { GradesModule } from '../grades/grades.module';
import { VideoProgressController } from './video-progress.controller';
import { VideoProgressRepository } from './video-progress.repository';
import { VideoProgressService } from './video-progress.service';

@Module({
  imports: [GradesModule],
  controllers: [VideoProgressController],
  providers: [VideoProgressService, VideoProgressRepository],
})
export class VideoProgressModule {}
