import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { Request } from 'express';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../constants';

// simple RBAC, might need refactor later
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const required = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // no @Roles() → any authenticated user is fine (JWT guard already ran)
    if (!required?.length) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user;

    // assumes role is present in token — not loading user from DB
    if (!user?.role) {
      throw new ForbiddenException('No role in context');
    }

    if (!required.includes(user.role as RoleName)) {
      throw new ForbiddenException('Wrong role');
    }

    return true;
  }
}
