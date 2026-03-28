import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// global so feature modules can inject Prisma without re-importing — basic setup for now
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
