import { HttpStatus, Injectable } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { ApiError } from '../common/http/api-error';
import { parseCookies } from '../common/utils/cookie';
import {
  hashPasswordArgon2,
  verifyDummyPassword,
  verifyPassword,
} from '../common/utils/crypto';
import { loginDelayMs, sleep } from '../common/utils/sleep';
import { normalizeUsername } from '../common/utils/username';
import { PrismaService } from '../prisma/prisma.service';
import { ServicesService } from '../services/services.service';
import type { LoginDto } from './auth.dto';
import { REFRESH_COOKIE, TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly services: ServicesService,
  ) {}

  async login(
    dto: LoginDto,
    ip: string,
    userAgent: string | undefined,
    reply: FastifyReply,
  ) {
    const username = normalizeUsername(dto.username);
    await this.applyLoginDelay(ip, username);

    if (
      !(await this.services.isRedirectAllowed(dto.service, dto.redirectUri))
    ) {
      throw new ApiError('invalid_redirect', 'Redirect URI is not allowed');
    }

    const user = await this.prisma.user.findUnique({
      where: { login: username },
    });

    if (!user || user.deletedAt || user.status === 'BLOCKED') {
      await verifyDummyPassword(dto.password);
      await this.recordLoginFail(ip, username, userAgent);
      throw new ApiError(
        'invalid_credentials',
        'Invalid username or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const ok = await verifyPassword({
      password: dto.password,
      hash: user.passwordHash,
      algo: user.passwordAlgo,
    });

    if (!ok) {
      await this.recordLoginFail(ip, username, userAgent);
      throw new ApiError(
        'invalid_credentials',
        'Invalid username or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.passwordAlgo === 'bcrypt') {
      const nextHash = await hashPasswordArgon2(dto.password);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: nextHash, passwordAlgo: 'argon2id' },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await this.tokens.createSession({
      userId: user.id,
      ip,
      userAgent,
    });
    const accessToken = await this.tokens.signAccess(user.id, dto.service);

    reply.header(
      'Set-Cookie',
      this.tokens.setRefreshCookieHeader(session.refreshToken),
    );

    await this.audit.log({
      event: 'login.ok',
      userId: user.id,
      ip,
      userAgent,
    });

    return {
      ok: true as const,
      data: {
        accessToken,
        user: {
          id: user.id,
          username: user.login,
          email: user.email,
          sandboxUntil: user.sandboxUntil,
        },
        redirectUri: dto.redirectUri,
      },
    };
  }

  async refresh(
    cookieHeader: string | string[] | undefined,
    ip: string,
    userAgent: string | undefined,
    reply: FastifyReply,
  ) {
    const cookies = parseCookies(cookieHeader);
    const raw = cookies[REFRESH_COOKIE];
    if (!raw) {
      throw new ApiError(
        'unauthorized',
        'Refresh token required',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const result = await this.tokens.rotateRefresh(raw);
    if (!result.ok) {
      reply.header('Set-Cookie', this.tokens.clearRefreshCookieHeader());
      if (result.reason === 'reuse') {
        await this.audit.log({
          event: 'refresh.reuse',
          ip,
          userAgent,
        });
      }
      throw new ApiError(
        'unauthorized',
        'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.prisma.session.update({
      where: { id: result.sessionId },
      data: { lastSeenAt: new Date(), ip, userAgent },
    });

    reply.header(
      'Set-Cookie',
      this.tokens.setRefreshCookieHeader(result.refreshToken),
    );

    await this.audit.log({
      event: 'refresh.ok',
      userId: result.userId,
      ip,
      userAgent,
    });

    return {
      ok: true as const,
      data: { accessToken: result.accessToken },
    };
  }

  async logout(
    cookieHeader: string | string[] | undefined,
    reply: FastifyReply,
  ) {
    const cookies = parseCookies(cookieHeader);
    const raw = cookies[REFRESH_COOKIE];
    if (raw) {
      const session = await this.tokens.findSessionByRefresh(raw);
      if (session && !session.revokedAt) {
        await this.tokens.revokeSession(session.id);
        await this.audit.log({
          event: 'logout',
          userId: session.userId,
        });
      }
    }
    reply.header('Set-Cookie', this.tokens.clearRefreshCookieHeader());
    return { ok: true as const, data: { loggedOut: true } };
  }

  async logoutAll(userId: string, reply: FastifyReply) {
    const count = await this.tokens.revokeAllForUser(userId);
    reply.header('Set-Cookie', this.tokens.clearRefreshCookieHeader());
    await this.audit.log({
      event: 'logout_all',
      userId,
      meta: { count },
    });
    return { ok: true as const, data: { revoked: count } };
  }

  private async applyLoginDelay(ip: string, username: string): Promise<void> {
    const since = new Date(Date.now() - 15 * 60 * 1000);
    const fails = await this.prisma.auditLog.count({
      where: {
        event: 'login.fail',
        createdAt: { gte: since },
        OR: [{ ip }, { meta: { path: ['username'], equals: username } }],
      },
    });
    const delay = loginDelayMs(fails);
    if (delay > 0) {
      await sleep(delay);
    }
  }

  private async recordLoginFail(
    ip: string,
    username: string,
    userAgent?: string,
  ): Promise<void> {
    await this.audit.log({
      event: 'login.fail',
      ip,
      userAgent,
      meta: { username },
    });
  }
}
