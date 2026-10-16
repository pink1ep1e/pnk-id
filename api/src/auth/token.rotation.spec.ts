import { sha256Hex } from '../common/utils/crypto';
import { TokenService } from './token.service';

const privatePem =
  '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEICsFi1tH50JAf71mzEkfCrAlO3fb3nVSyk2qOmN+01a6\n-----END PRIVATE KEY-----\n';
const publicPem =
  '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAu6bmA3gj+xwxfU+ZoOjXhnhujeQBxB4Gi4sDOhDjHfE=\n-----END PUBLIC KEY-----\n';

type SessionRow = {
  id: string;
  userId: string;
  refreshHash: string;
  familyId: string;
  revokedAt: Date | null;
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
  current: boolean;
};

describe('TokenService.rotateRefresh', () => {
  function setup() {
    const sessions = new Map<string, SessionRow>();

    const prisma = {
      session: {
        findUnique: ({
          where,
        }: {
          where: { refreshHash?: string; id?: string };
        }) => {
          if (where.refreshHash) {
            return Promise.resolve(
              [...sessions.values()].find(
                (s) => s.refreshHash === where.refreshHash,
              ) ?? null,
            );
          }
          if (where.id) return Promise.resolve(sessions.get(where.id) ?? null);
          return Promise.resolve(null);
        },
        update: ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const row = sessions.get(where.id);
          if (!row) return Promise.reject(new Error('missing'));
          Object.assign(row, data);
          return Promise.resolve(row);
        },
        create: ({ data }: { data: Record<string, unknown> }) => {
          const row: SessionRow = {
            id: `s_${sessions.size + 1}`,
            userId: data.userId as string,
            refreshHash: data.refreshHash as string,
            familyId: data.familyId as string,
            revokedAt: null,
            expiresAt: data.expiresAt as Date,
            ip: (data.ip as string) ?? null,
            userAgent: (data.userAgent as string) ?? null,
            current: Boolean(data.current),
          };
          sessions.set(row.id, row);
          return Promise.resolve(row);
        },
        updateMany: ({
          where,
          data,
        }: {
          where: { familyId?: string; revokedAt?: null };
          data: Record<string, unknown>;
        }) => {
          let count = 0;
          for (const row of sessions.values()) {
            if (where.familyId && row.familyId !== where.familyId) continue;
            if (where.revokedAt === null && row.revokedAt) continue;
            Object.assign(row, data);
            count += 1;
          }
          return Promise.resolve({ count });
        },
      },
      $transaction: (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
    };

    const config = {
      raw: {
        JWT_ACTIVE_KID: 'dev-1',
        JWT_ISSUER: 'http://localhost:3100',
        JWT_PRIVATE_KEYS: { 'dev-1': privatePem },
        JWT_PUBLIC_KEYS: { 'dev-1': publicPem },
        COOKIE_DOMAIN: 'localhost',
      },
      isProd: false,
    };

    const tokens = new TokenService(config as never, prisma as never);
    return { tokens, sessions };
  }

  it('rotates refresh and invalidates old token via reuse detection', async () => {
    const { tokens, sessions } = setup();
    await tokens.onModuleInit();

    const refresh = 'refresh-token-one';
    sessions.set('s1', {
      id: 's1',
      userId: 'u1',
      refreshHash: sha256Hex(refresh),
      familyId: 'fam1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      ip: '1.1.1.1',
      userAgent: 'test',
      current: true,
    });

    const first = await tokens.rotateRefresh(refresh);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const reused = await tokens.rotateRefresh(refresh);
    expect(reused).toEqual({ ok: false, reason: 'reuse' });

    const family = [...sessions.values()].filter((s) => s.familyId === 'fam1');
    expect(family.every((s) => s.revokedAt !== null)).toBe(true);
  });

  it('rejects expired refresh', async () => {
    const { tokens, sessions } = setup();
    await tokens.onModuleInit();
    const refresh = 'expired-token';
    sessions.set('s1', {
      id: 's1',
      userId: 'u1',
      refreshHash: sha256Hex(refresh),
      familyId: 'fam1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      ip: null,
      userAgent: null,
      current: true,
    });
    await expect(tokens.rotateRefresh(refresh)).resolves.toEqual({
      ok: false,
      reason: 'expired',
    });
  });
});
