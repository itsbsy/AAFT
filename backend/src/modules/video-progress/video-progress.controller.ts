import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { UpsertVideoProgressDto } from './dto/upsert-video-progress.dto';
import { VideoProgressService } from './video-progress.service';

@Controller('video-progress')
export class VideoProgressController {
  constructor(private readonly videoProgressService: VideoProgressService) {}

  @Put('units/:unitId')
  upsert(
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Body() dto: UpsertVideoProgressDto,
    @Req() req: Request,
  ) {
    return this.videoProgressService.upsertForUnit(unitId, dto, req.user!);
  }

  @Get('aggregate')
  aggregate(@Req() req: Request) {
    return this.videoProgressService.aggregatePlaceholder(req.user!);
  }
}
