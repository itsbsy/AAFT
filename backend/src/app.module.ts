import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { CourseRunsModule } from './modules/course-runs/course-runs.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { GradesModule } from './modules/grades/grades.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { VideoProgressModule } from './modules/video-progress/video-progress.module';
import { CoursesModule } from './modules/courses/courses.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({
  imports: [
    // loads .env into process.env — basic setup for now
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CertificatesModule,
    AdminModule,
    CoursesModule,
    CourseRunsModule,
    EnrollmentsModule,
    VideoProgressModule,
    QuizzesModule,
    GradesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // global order: JWT first, then roles
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
