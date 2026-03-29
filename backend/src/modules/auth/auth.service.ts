import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenBodyDto } from './dto/refresh-token-body.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_SALT_ROUNDS = 10;

// refresh token TTL  no rotation for now, keeping it simple
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;


export type JwtPayload = {
  userId: string;
  role: RoleName;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const roleName = dto.role ?? RoleName.Student;
    const email = dto.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const role = await this.ensureRole(roleName);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: role.id,
      },
      include: { role: true },
    });

    const refreshToken = await this.issueRefreshToken(user.id);
    return {
      accessToken: this.signAccessToken(user),
      refreshToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const email = dto.email.toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    // not handling edge cases rn (lockout, MFA, etc.)
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const refreshToken = await this.issueRefreshToken(user.id);
    return {
      accessToken: this.signAccessToken(user),
      refreshToken,
    };
  }

  /** exchange refresh for a new access token  same refresh stays valid (no rotation) */
  async refresh(dto: RefreshTokenBodyDto): Promise<{ accessToken: string }> {
    const tokenHash = this.hashRefreshToken(dto.refreshToken);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { role: true } } },
    });

    if (!row || row.expiresAt <= new Date()) {
      if (row) {
        await this.prisma.refreshToken.delete({ where: { id: row.id } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!row.user.isActive) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return { accessToken: this.signAccessToken(row.user) };
  }

  /** logout just invalidates token */
  async logout(dto: RefreshTokenBodyDto): Promise<{ ok: true }> {
    const tokenHash = this.hashRefreshToken(dto.refreshToken);
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    return { ok: true };
  }

  // storing token hash only raw refresh only exists on the client until logout
  private hashRefreshToken(plain: string): string {
    return createHash('sha256').update(plain, 'utf8').digest('hex');
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const plain = randomBytes(32).toString('base64url');
    const tokenHash = this.hashRefreshToken(plain);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
    return plain;
  }

  private signAccessToken(user: {
    id: string;
    role: { name: RoleName };
  }): string {
    const payload: JwtPayload = {
      userId: user.id,
      role: user.role.name,
    };
    const expiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES', '15m');
    return this.jwt.sign(payload, {
      expiresIn: expiresIn as import('ms').StringValue,
    });
  }

  /** lazy role row — not ideal for prod, will improve later */
  private async ensureRole(name: RoleName) {
    let role = await this.prisma.role.findUnique({ where: { name } });
    if (!role) {
      role = await this.prisma.role.create({ data: { name } });
    }
    return role;
  }
}
