import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashPasswordArgon2 } from '../src/common/utils/crypto';
import { REFRESH_COOKIE } from '../src/auth/token.service';

function cookieValue(setCookie: string | string[] | undefined): string {
  const raw = Array.isArray(setCookie)
    ? setCookie.join(';')
    : String(setCookie ?? '');
  const part = raw.split(`${REFRESH_COOKIE}=`)[1];
  if (!part) return '';
  return decodeURIComponent(part.split(';')[0]);
}

describe('Auth login/refresh (e2e)', () => {
  let app: NestFastifyApplication;
  const users: Array<Record<string, unknown>> = [];
  const sessions = new Map<string, Record<string, unknown>>();

  const prismaMock = {
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $queryRaw: () => Promise.resolve([{ '?column?': 1 }]),
    onModuleInit: () => Promise.resolve(),
    onModuleDestroy: () => Promise.resolve(),
    user: {
      findUnique: ({ where }: { where: { login?: string; id?: string } }) => {
        if (where.login) {
          return Promise.resolve(
            users.find((u) => u.login === where.login) ?? null,
          );
        }
        if (where.id) {
          return Promise.resolve(users.find((u) => u.id === where.id) ?? null);
        }
        return Promise.resolve(null);
      },
      update: ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const user = users.find((u) => u.id === where.id);
        if (!user) return Promise.reject(new Error('missing'));
        Object.assign(user, data);
        return Promise.resolve(user);
      },
    },
    session: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        const now = new Date();
        const row = {
          id: `s_${sessions.size + 1}`,
          ...data,
          revokedAt: null,
          createdAt: now,
          lastSeenAt: now,
        };
        sessions.set(row.id, row);
        return Promise.resolve(row);
      },
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
      updateMany: ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        let count = 0;
        for (const row of sessions.values()) {
          if (where.familyId && row.familyId !== where.familyId) continue;
          if (where.userId && row.userId !== where.userId) continue;
          if (where.id && row.id !== where.id) continue;
          if (where.revokedAt === null && row.revokedAt) continue;
          Object.assign(row, data);
          count += 1;
        }
        return Promise.resolve({ count });
      },
      findMany: ({ where }: { where: Record<string, unknown> }) => {
        const list = [...sessions.values()].filter((s) => {
          if (where.userId && s.userId !== where.userId) return false;
          if (where.revokedAt === null && s.revokedAt) return false;
          return true;
        });
        return Promise.resolve(list);
      },
    },
    auditLog: {
      count: () => Promise.resolve(0),
      create: () => Promise.resolve({}),
    },
    service: { findFirst: () => Promise.resolve(null) },
    $transaction: (fn: (tx: typeof prismaMock) => Promise<unknown>) =>
      fn(prismaMock),
  };

  beforeAll(async () => {
    const passwordHash = await hashPasswordArgon2('password123');
    users.push({
      id: 'u1',
      login: 'bob01',
      email: null,
      passwordHash,
      passwordAlgo: 'argon2id',
      status: 'ACTIVE',
      deletedAt: null,
      sandboxUntil: null,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login → refresh rotation → reuse denied → sessions', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/v1/login',
      payload: { username: 'bob01', password: 'password123' },
    });
    expect(login.statusCode).toBe(200);
    const access1 = login.json<{ data: { accessToken: string } }>().data
      .accessToken;
    const refresh1 = cookieValue(login.headers['set-cookie']);
    expect(refresh1).toBeTruthy();

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/v1/refresh',
      headers: { cookie: `${REFRESH_COOKIE}=${refresh1}` },
    });
    expect(refreshRes.statusCode).toBe(200);
    expect(
      refreshRes.json<{ data: { accessToken: string } }>().data.accessToken,
    ).toBeTruthy();

    const reused = await app.inject({
      method: 'POST',
      url: '/v1/refresh',
      headers: { cookie: `${REFRESH_COOKIE}=${refresh1}` },
    });
    expect(reused.statusCode).toBe(401);

    // new login for sessions list
    sessions.clear();
    const login2 = await app.inject({
      method: 'POST',
      url: '/v1/login',
      payload: { username: 'bob01', password: 'password123' },
    });
    const access2 = login2.json<{ data: { accessToken: string } }>().data
      .accessToken;

    const list = await app.inject({
      method: 'GET',
      url: '/v1/sessions',
      headers: { authorization: `Bearer ${access2}` },
    });
    expect(list.statusCode).toBe(200);
    expect(
      list.json<{ data: { sessions: unknown[] } }>().data.sessions.length,
    ).toBeGreaterThan(0);

    const logout = await app.inject({
      method: 'POST',
      url: '/v1/logout',
      headers: {
        cookie: `${REFRESH_COOKIE}=${cookieValue(login2.headers['set-cookie'])}`,
      },
    });
    expect(logout.statusCode).toBe(200);
    void access1;
  });
});
