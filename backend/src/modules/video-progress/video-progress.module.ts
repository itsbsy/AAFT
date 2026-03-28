import { Module } from '@nestjs/common';
import { VideoProgressController } from './video-progress.controller';
import { VideoProgressRepository } from './video-progress.repository';
import { VideoProgressService } from './video-progress.service';

@Module({
  controllers: [VideoProgressController],
  providers: [VideoProgressService, VideoProgressRepository],
})
export class VideoProgressModule {}
