import { IsString, MinLength } from 'class-validator';

/** body for POST /auth/refresh and POST /auth/logout */
export class RefreshTokenBodyDto {
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}
