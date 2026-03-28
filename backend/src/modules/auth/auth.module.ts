import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RbacDemoController } from './rbac-demo.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      // basic setup for now rotation/ refresh flow later
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') as import('ms').StringValue,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, RbacDemoController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
