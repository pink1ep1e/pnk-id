/**
 * Example NestJS guard for pnk-mail (or any PNK service).
 * Copy into the consumer service and wire JWT_ISSUER / JWKS_URL via env.
 *
 * npm i jose @nestjs/common
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URL =
  process.env.PNK_ID_JWKS_URL ??
  'https://id.pnkmail.ru/.well-known/jwks.json';
const ISSUER = process.env.PNK_ID_ISSUER ?? 'https://id.pnkmail.ru';

const jwks = createRemoteJWKSet(new URL(JWKS_URL));

export type PnkIdAuth = { userId: string; svc?: string };

@Injectable()
export class PnkIdJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      pnkId?: PnkIdAuth;
    }>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: ISSUER,
        algorithms: ['EdDSA'],
      });
      if (!payload.sub) {
        throw new UnauthorizedException('Missing sub');
      }
      req.pnkId = {
        userId: payload.sub,
        svc: typeof payload.svc === 'string' ? payload.svc : undefined,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}

/**
 * Mailbox binding (in pnk-mail DB):
 *   mailbox.pnkIdUserId = req.pnkId.userId
 * sandboxUntil: fetch GET {PNK_ID}/v1/me with the same Bearer when needed.
 */
