import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TokenService } from '../src/auth/token.service';
import { hashPasswordArgon2 } from '../src/common/utils/crypto';

describe('Users /me (e2e)', () => {
  let app: NestFastifyApplication;
  let accessToken: string;
  const user = {
    id: 'u1',
    login: 'carol01',
    email: null as string | null,
    phone: null as string | null,
    displayName: null as string | null,
    firstName: null as string | null,
    lastName: null as string | null,
    gender: null as string | null,
    birthDate: null as string | null,
    timezone: '(UTC+03:00) Москва',
    avatarUrl: null as string | null,
    telegramUsername: null as string | null,
    status: 'ACTIVE',
    sandboxUntil: null,
    lastLoginAt: null,
    createdAt: new Date(),
    deletedAt: null,
    passwordHash: '',
    passwordAlgo: 'argon2id' as const,
  };

  const prismaMock = {
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $queryRaw: () => Promise.resolve([{ '?column?': 1 }]),
    onModuleInit: () => Promise.resolve(),
    onModuleDestroy: () => Promise.resolve(),
    user: {
      findUnique: () => Promise.resolve(user),
      findFirst: () => Promise.resolve(null),
      update: ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(user, data);
        return Promise.resolve(user);
      },
    },
    auditLog: { create: () => Promise.resolve({}) },
  };

  beforeAll(async () => {
    user.passwordHash = await hashPasswordArgon2('password123');

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

    const tokens = app.get(TokenService);
    accessToken = await tokens.signAccess(user.id);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET/PATCH /v1/me and change password', async () => {
    const me = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(me.statusCode).toBe(200);
    expect(
      me.json<{ data: { user: { username: string } } }>().data.user.username,
    ).toBe('carol01');

    const patch = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { displayName: 'Carol', firstName: 'Car' },
    });
    expect(patch.statusCode).toBe(200);
    expect(
      patch.json<{ data: { user: { displayName: string } } }>().data.user
        .displayName,
    ).toBe('Carol');

    const pwd = await app.inject({
      method: 'POST',
      url: '/v1/me/password',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        currentPassword: 'password123',
        newPassword: 'password456',
      },
    });
    expect(pwd.statusCode).toBe(200);
    expect(pwd.json<{ data: { changed: boolean } }>().data.changed).toBe(true);
  });
});
