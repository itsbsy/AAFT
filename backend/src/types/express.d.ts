import type { JwtPayload } from '../modules/auth/auth.service';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
