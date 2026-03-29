import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** body for POST /auth/refresh and POST /auth/logout */
export class RefreshTokenBodyDto {
  @ApiProperty({ description: 'Opaque refresh token from login/register' })
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}
