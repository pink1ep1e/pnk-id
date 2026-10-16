import { ApiError } from '../common/http/api-error';
import { hashPasswordArgon2 } from '../common/utils/crypto';
import { UsersService } from './users.service';

describe('UsersService', () => {
  it('returns public profile', async () => {
    const user = {
      id: 'u1',
      login: 'alice',
      email: 'a@b.c',
      phone: null,
      displayName: 'Alice',
      firstName: null,
      lastName: null,
      gender: null,
      birthDate: null,
      timezone: null,
      avatarUrl: null,
      telegramUsername: null,
      status: 'ACTIVE',
      sandboxUntil: null,
      lastLoginAt: null,
      createdAt: new Date(),
      deletedAt: null,
      passwordHash: 'x',
      passwordAlgo: 'argon2id' as const,
    };
    const prisma = {
      user: {
        findUnique: () => Promise.resolve(user),
      },
    };
    const audit = { log: jest.fn() };
    const svc = new UsersService(prisma as never, audit as never);
    const res = await svc.getMe('u1');
    expect(res.data.user.username).toBe('alice');
    expect(res.data.user).not.toHaveProperty('passwordHash');
  });

  it('changes password when current is valid', async () => {
    const passwordHash = await hashPasswordArgon2('old-pass-1');
    const user = {
      id: 'u1',
      login: 'alice',
      email: null,
      phone: null,
      displayName: null,
      firstName: null,
      lastName: null,
      gender: null,
      birthDate: null,
      timezone: null,
      avatarUrl: null,
      telegramUsername: null,
      status: 'ACTIVE',
      sandboxUntil: null,
      lastLoginAt: null,
      createdAt: new Date(),
      deletedAt: null,
      passwordHash,
      passwordAlgo: 'argon2id' as const,
    };
    const update = jest.fn().mockResolvedValue(user);
    const prisma = {
      user: {
        findUnique: () => Promise.resolve(user),
        update,
      },
    };
    const audit = { log: jest.fn() };
    const svc = new UsersService(prisma as never, audit as never);

    await expect(
      svc.changePassword('u1', {
        currentPassword: 'wrong',
        newPassword: 'new-pass-12',
      }),
    ).rejects.toBeInstanceOf(ApiError);

    await expect(
      svc.changePassword('u1', {
        currentPassword: 'old-pass-1',
        newPassword: 'new-pass-12',
      }),
    ).resolves.toEqual({ ok: true, data: { changed: true } });

    expect(update).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'password.change' }),
    );
  });
});
