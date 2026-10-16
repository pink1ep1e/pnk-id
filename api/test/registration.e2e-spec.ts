import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CaptchaService } from '../src/captcha/captcha.service';
import { TelegramNotifyService } from '../src/telegram/telegram-notify.service';
import { sha256Hex } from '../src/common/utils/crypto';

describe('Registration (e2e)', () => {
  let app: NestFastifyApplication;
  const pendingStore = new Map<string, Record<string, unknown>>();
  const users: Array<Record<string, unknown>> = [];

  const prismaMock = {
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $queryRaw: () => Promise.resolve([{ '?column?': 1 }]),
    onModuleInit: () => Promise.resolve(),
    onModuleDestroy: () => Promise.resolve(),
    user: {
      findUnique: ({ where }: { where: { login?: string } }) =>
        Promise.resolve(users.find((u) => u.login === where.login) ?? null),
      findFirst: ({ where }: { where: { telegramId?: bigint } }) =>
        Promise.resolve(
          users.find((u) => u.telegramId === where.telegramId) ?? null,
        ),
      create: ({ data }: { data: Record<string, unknown> }) => {
        const user = { id: `u_${users.length + 1}`, ...data };
        users.push(user);
        return Promise.resolve(user);
      },
    },
    pendingRegistration: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `p_${pendingStore.size + 1}`,
          status: 'PENDING',
          codeAttempts: 0,
          codeSentCount: 0,
          lastCodeSentAt: null,
          tgCodeHash: null,
          ...data,
        };
        pendingStore.set(row.id, row);
        return Promise.resolve(row);
      },
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(pendingStore.get(where.id) ?? null),
      findFirst: ({
        where,
      }: {
        where: { tgLinkTokenHash: string; status: string };
      }) =>
        Promise.resolve(
          [...pendingStore.values()].find(
            (p) =>
              p.tgLinkTokenHash === where.tgLinkTokenHash &&
              p.status === where.status,
          ) ?? null,
        ),
      update: ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = pendingStore.get(where.id);
        if (!row) return Promise.reject(new Error('missing'));
        const next = { ...row };
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === 'object' && 'increment' in v) {
            next[k] =
              Number(next[k] ?? 0) +
              Number((v as { increment: number }).increment);
          } else {
            next[k] = v;
          }
        }
        pendingStore.set(where.id, next);
        return Promise.resolve(next);
      },
    },
    registrationAttempt: {
      count: () => Promise.resolve(0),
      create: () => Promise.resolve({}),
    },
    auditLog: { create: () => Promise.resolve({}) },
    service: { findFirst: () => Promise.resolve(null) },
    session: {
      create: ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 's1', ...data }),
    },
    $transaction: (fn: (tx: typeof prismaMock) => Promise<unknown>) =>
      fn(prismaMock),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(CaptchaService)
      .useValue({ verifyTurnstile: () => Promise.resolve(true) })
      .overrideProvider(TelegramNotifyService)
      .useValue({
        sendCode: () => Promise.resolve(),
        alertAdmin: () => Promise.resolve(),
      })
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

  it('start → telegram link → verify', async () => {
    const start = await app.inject({
      method: 'POST',
      url: '/v1/register/start',
      payload: {
        username: 'alice01',
        password: 'password123',
        turnstileToken: 'ok',
      },
    });
    expect(start.statusCode).toBe(200);
    const startBody = start.json<{
      ok: boolean;
      data: { pendingId: string; telegramDeepLink: string };
    }>();
    expect(startBody.ok).toBe(true);
    const pendingId = startBody.data.pendingId;
    const linkToken = new URL(startBody.data.telegramDeepLink).searchParams.get(
      'start',
    );
    expect(linkToken).toBeTruthy();

    const pending = pendingStore.get(pendingId)!;
    const code = '123456';
    pendingStore.set(pendingId, {
      ...pending,
      tgCodeHash: sha256Hex(code),
      codeSentCount: 1,
      lastCodeSentAt: new Date(),
      payload: {
        ...(pending.payload as object),
        telegramId: '424242',
        telegramUsername: 'alice_tg',
        linkConsumed: true,
        codeExpiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });

    const verify = await app.inject({
      method: 'POST',
      url: '/v1/register/verify',
      payload: { pendingId, code },
    });
    expect(verify.statusCode).toBe(200);
    const verifyBody = verify.json<{
      ok: boolean;
      data: { accessToken: string; user: { username: string } };
    }>();
    expect(verifyBody.ok).toBe(true);
    expect(verifyBody.data.user.username).toBe('alice01');
    expect(verifyBody.data.accessToken).toBeTruthy();
    const setCookie = verify.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie)
      ? setCookie.join(';')
      : String(setCookie ?? '');
    expect(cookieHeader).toContain('pnk_id_refresh=');
  });
});
