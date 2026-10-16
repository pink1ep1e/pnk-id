import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ApiError } from '../common/http/api-error';
import { TokenService } from './token.service';

export type AuthUser = { userId: string; svc?: string };

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new ApiError(
        'unauthorized',
        'Bearer access token required',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      const payload = await this.tokens.verifyAccess(token);
      req.authUser = { userId: payload.sub, svc: payload.svc };
      return true;
    } catch {
      throw new ApiError(
        'unauthorized',
        'Invalid access token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
