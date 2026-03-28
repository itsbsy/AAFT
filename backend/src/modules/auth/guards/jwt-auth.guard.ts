import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../constants';
import type { JwtPayload } from '../auth.service';

// simple RBAC stack part 1 — might need refactor later
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
      const payload = this.jwt.verify<JwtPayload>(token);
      // assumes role is present in token — not re-validating against DB rn
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractBearer(req: Request): string | null {
    const raw = req.headers.authorization;
    if (!raw?.startsWith('Bearer ')) {
      return null;
    }
    return raw.slice('Bearer '.length).trim() || null;
  }
}
