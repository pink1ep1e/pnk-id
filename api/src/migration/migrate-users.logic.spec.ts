import {
  detectPasswordAlgo,
  planUserMigration,
  statusFromBlockedAt,
  type SourceUser,
} from './migrate-users.logic';

function source(partial: Partial<SourceUser> = {}): SourceUser {
  return {
    id: 'u1',
    login: 'alice',
    email: null,
    phone: null,
    passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUV',
    blockedAt: null,
    deletedAt: null,
    displayName: null,
    firstName: null,
    lastName: null,
    gender: null,
    birthDate: null,
    timezone: null,
    avatarUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...partial,
  };
}

describe('migrate-users.logic', () => {
  it('detects algo from hash', () => {
    expect(detectPasswordAlgo('$2b$12$abc')).toBe('bcrypt');
    expect(detectPasswordAlgo('$argon2id$v=19$m=1$aa$bb')).toBe('argon2id');
    expect(detectPasswordAlgo('$2a$12$abc', 'argon2id')).toBe('argon2id');
  });

  it('maps blockedAt to status', () => {
    expect(statusFromBlockedAt(new Date())).toBe('BLOCKED');
    expect(statusFromBlockedAt(null)).toBe('ACTIVE');
    expect(statusFromBlockedAt(null, 'FROZEN')).toBe('FROZEN');
  });

  it('creates when target missing', () => {
    const plan = planUserMigration(source({ blockedAt: new Date() }), null);
    expect(plan.action).toBe('create');
    if (plan.action === 'create') {
      expect(plan.data.passwordAlgo).toBe('bcrypt');
      expect(plan.data.status).toBe('BLOCKED');
      expect(plan.data.passwordHash).toBe(source().passwordHash);
    }
  });

  it('skips when already migrated', () => {
    const plan = planUserMigration(source(), {
      id: 'u1',
      login: 'alice',
      passwordAlgo: 'bcrypt',
      status: 'ACTIVE',
      blockedAt: null,
    });
    expect(plan).toEqual({ action: 'skip', reason: 'already_migrated' });
  });

  it('updates status from blockedAt without touching argon2id', () => {
    const blockedAt = new Date('2024-06-01');
    const plan = planUserMigration(source({ blockedAt }), {
      id: 'u1',
      login: 'alice',
      passwordAlgo: 'argon2id',
      status: 'ACTIVE',
      blockedAt: null,
    });
    expect(plan.action).toBe('update');
    if (plan.action === 'update') {
      expect(plan.data.passwordAlgo).toBeUndefined();
      expect(plan.data.status).toBe('BLOCKED');
      expect(plan.data.blockedAt).toEqual(blockedAt);
    }
  });
});
