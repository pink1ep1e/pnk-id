import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../common/http/api-error';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../auth/token.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async list(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        createdAt: true,
        lastSeenAt: true,
        expiresAt: true,
        current: true,
      },
    });

    return {
      ok: true as const,
      data: {
        sessions: sessions.map((s) => ({
          id: s.id,
          ip: s.ip,
          userAgent: s.userAgent,
          createdAt: s.createdAt,
          lastUsedAt: s.lastSeenAt,
          expiresAt: s.expiresAt,
          current: s.current,
        })),
      },
    };
  }

  async revoke(userId: string, sessionId: string) {
    const ok = await this.tokens.revokeSession(sessionId, userId);
    if (!ok) {
      throw new ApiError(
        'not_found',
        'Session not found',
        HttpStatus.NOT_FOUND,
      );
    }
    await this.audit.log({
      event: 'session.revoke',
      userId,
      meta: { sessionId },
    });
    return { ok: true as const, data: { revoked: true } };
  }
}
