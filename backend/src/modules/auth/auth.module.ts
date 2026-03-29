import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RbacDemoController } from './rbac-demo.controller';

@Module({
  imports: [
    // basic rate limit on auth controller via @UseGuards(ThrottlerGuard) can tune / add redis later
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 40,
      },
    ]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret'),
        // access expiry is set per sign() in AuthService default 15m
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, RbacDemoController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
