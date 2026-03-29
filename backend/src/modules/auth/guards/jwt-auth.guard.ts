import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from '../auth.service';
import { IS_PUBLIC_KEY } from '../constants';

// validates Bearer JWT and attaches JwtPayload  refresh tokens are not accepted here
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearer(req);
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const payload = this.jwt.verify<JwtPayload>(token);      if (!this.isValidPayload(payload)) {
        throw new UnauthorizedException('Invalid token');
      }
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private isValidPayload(p: unknown): p is JwtPayload {
    if (!p || typeof p !== 'object') {
      return false;
    }
    const o = p as Record<string, unknown>;
    if (typeof o.userId !== 'string' || o.userId.length < 1) {
      return false;
    }
    if (!Object.values(RoleName).includes(o.role as RoleName)) {
      return false;
    }
    return true;
  }

  private extractBearer(req: Request): string | null {
    const raw = req.headers.authorization;
    if (!raw?.startsWith('Bearer ')) {
      return null;
    }
    const token = raw.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }
}
