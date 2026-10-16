import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  createLocalJWKSet,
  exportJWK,
  importPKCS8,
  importSPKI,
  jwtVerify,
  SignJWT,
} from 'jose';
import type { JWK } from 'jose';
import { AppConfigService } from '../config/config.service';
import {
  clearCookie,
  serializeCookie,
  type CookieSerializeOptions,
} from '../common/utils/cookie';
import { randomToken, sha256Hex } from '../common/utils/crypto';
import { PrismaService } from '../prisma/prisma.service';

export const REFRESH_COOKIE = 'pnk_id_refresh';
const ACCESS_TTL_SEC = 10 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type JoseKey = Awaited<ReturnType<typeof importPKCS8>>;

export type RotateResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
      userId: string;
      sessionId: string;
    }
  | { ok: false; reason: 'invalid' | 'reuse' | 'revoked' | 'expired' };

@Injectable()
export class TokenService implements OnModuleInit {
  private privateKeys = new Map<string, JoseKey>();
  private publicJwks: JWK[] = [];

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const [kid, pem] of Object.entries(this.config.raw.JWT_PRIVATE_KEYS)) {
      this.privateKeys.set(kid, await importPKCS8(pem, 'EdDSA'));
    }
    for (const [kid, pem] of Object.entries(this.config.raw.JWT_PUBLIC_KEYS)) {
      const key = await importSPKI(pem, 'EdDSA');
      const jwk = await exportJWK(key);
      jwk.kid = kid;
      jwk.alg = 'EdDSA';
      jwk.use = 'sig';
      this.publicJwks.push(jwk);
    }
  }

  jwks() {
    return { keys: this.publicJwks };
  }

  async signAccess(userId: string, service?: string): Promise<string> {
    await this.ensureKeys();
    const kid = this.config.raw.JWT_ACTIVE_KID;
    const key = this.privateKeys.get(kid);
    if (!key) {
      throw new Error('Missing active JWT private key');
    }

    return new SignJWT({
      typ: 'access',
      ...(service ? { svc: service } : {}),
    })
      .setProtectedHeader({ alg: 'EdDSA', kid })
      .setSubject(userId)
      .setIssuer(this.config.raw.JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TTL_SEC}s`)
      .sign(key);
  }

  async verifyAccess(token: string): Promise<{ sub: string; svc?: string }> {
    await this.ensureKeys();
    const jwks = createLocalJWKSet({ keys: this.publicJwks });
    const { payload } = await jwtVerify(token, jwks, {
      issuer: this.config.raw.JWT_ISSUER,
      algorithms: ['EdDSA'],
    });
    if (!payload.sub) {
      throw new Error('missing_sub');
    }
    return {
      sub: payload.sub,
      svc: typeof payload.svc === 'string' ? payload.svc : undefined,
    };
  }

  async createSession(params: {
    userId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ refreshToken: string; sessionId: string; familyId: string }> {
    const refreshToken = randomToken(32);
    const familyId = randomToken(16);
    const session = await this.prisma.session.create({
      data: {
        userId: params.userId,
        refreshHash: sha256Hex(refreshToken),
        familyId,
        ip: params.ip,
        userAgent: params.userAgent,
        current: true,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { refreshToken, sessionId: session.id, familyId };
  }

  /**
   * Rotate refresh token. Reuse of an already-rotated token revokes the whole family.
   */
  async rotateRefresh(rawRefresh: string): Promise<RotateResult> {
    const hash = sha256Hex(rawRefresh);
    const session = await this.prisma.session.findUnique({
      where: { refreshHash: hash },
    });

    if (!session) {
      // Possible reuse: token was rotated away; look for revoked siblings by scanning
      // is not possible without storing old hashes. Convention: unknown hash = invalid.
      return { ok: false, reason: 'invalid' };
    }

    if (session.revokedAt) {
      // Reuse of revoked refresh → revoke entire family
      if (session.familyId) {
        await this.revokeFamily(session.familyId);
      }
      return { ok: false, reason: 'reuse' };
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return { ok: false, reason: 'expired' };
    }

    const newRefresh = randomToken(32);
    const newHash = sha256Hex(newRefresh);

    // Mark old session revoked and create rotated session in same family
    await this.prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date(), current: false },
      });
      await tx.session.create({
        data: {
          userId: session.userId,
          refreshHash: newHash,
          familyId: session.familyId,
          ip: session.ip,
          userAgent: session.userAgent,
          current: true,
          expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        },
      });
    });

    const created = await this.prisma.session.findUnique({
      where: { refreshHash: newHash },
    });
    if (!created) {
      return { ok: false, reason: 'invalid' };
    }

    const accessToken = await this.signAccess(session.userId);
    return {
      ok: true,
      accessToken,
      refreshToken: newRefresh,
      userId: session.userId,
      sessionId: created.id,
    };
  }

  /**
   * Detect reuse when client presents a refresh that no longer matches any row
   * but was previously used: we store rotated-away hashes as revoked rows, so
   * findUnique above already handles reuse via revokedAt.
   *
   * Additional path: if hash unknown, check Audit — not needed; revoked row keeps hash.
   */
  async revokeSession(sessionId: string, userId?: string): Promise<boolean> {
    const where = userId
      ? { id: sessionId, userId, revokedAt: null }
      : { id: sessionId, revokedAt: null };
    const result = await this.prisma.session.updateMany({
      where,
      data: { revokedAt: new Date(), current: false },
    });
    return result.count > 0;
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), current: false },
    });
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), current: false },
    });
    return result.count;
  }

  async findSessionByRefresh(rawRefresh: string) {
    return this.prisma.session.findUnique({
      where: { refreshHash: sha256Hex(rawRefresh) },
    });
  }

  refreshCookieOptions(): CookieSerializeOptions {
    return {
      httpOnly: true,
      secure: this.config.isProd,
      sameSite: 'lax',
      domain: this.config.raw.COOKIE_DOMAIN,
      path: '/v1',
      maxAge: REFRESH_TTL_MS / 1000,
    };
  }

  setRefreshCookieHeader(refreshToken: string): string {
    return serializeCookie(
      REFRESH_COOKIE,
      refreshToken,
      this.refreshCookieOptions(),
    );
  }

  clearRefreshCookieHeader(): string {
    return clearCookie(REFRESH_COOKIE, this.refreshCookieOptions());
  }

  private async ensureKeys(): Promise<void> {
    if (this.privateKeys.size === 0) {
      await this.onModuleInit();
    }
  }
}
