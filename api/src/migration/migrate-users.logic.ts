export type SourceUser = {
  id: string;
  login: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  passwordAlgo?: 'argon2id' | 'bcrypt' | null;
  status?: 'ACTIVE' | 'FROZEN' | 'BLOCKED' | null;
  blockedAt: Date | null;
  deletedAt: Date | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  birthDate: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  telegramId?: bigint | null;
  telegramUsername?: string | null;
  registrationIp?: string | null;
  sandboxUntil?: Date | null;
  lastLoginAt?: Date | null;
};

export type TargetUser = {
  id: string;
  login: string;
  passwordAlgo: 'argon2id' | 'bcrypt';
  status: 'ACTIVE' | 'FROZEN' | 'BLOCKED';
  blockedAt: Date | null;
};

export type MigrateAction =
  | { action: 'skip'; reason: string }
  | {
      action: 'update';
      id: string;
      data: {
        passwordAlgo?: 'bcrypt';
        status?: 'ACTIVE' | 'FROZEN' | 'BLOCKED';
        blockedAt?: Date | null;
      };
    }
  | {
      action: 'create';
      data: {
        id: string;
        login: string;
        email: string | null;
        phone: string | null;
        passwordHash: string;
        passwordAlgo: 'bcrypt' | 'argon2id';
        status: 'ACTIVE' | 'FROZEN' | 'BLOCKED';
        blockedAt: Date | null;
        deletedAt: Date | null;
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
        gender: string | null;
        birthDate: string | null;
        timezone: string | null;
        avatarUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        telegramId: bigint | null;
        telegramUsername: string | null;
        registrationIp: string | null;
        sandboxUntil: Date | null;
        lastLoginAt: Date | null;
      };
    };

export function detectPasswordAlgo(
  hash: string,
  existing?: 'argon2id' | 'bcrypt' | null,
): 'argon2id' | 'bcrypt' {
  if (existing === 'argon2id' || hash.startsWith('$argon2')) {
    return 'argon2id';
  }
  return 'bcrypt';
}

export function statusFromBlockedAt(
  blockedAt: Date | null,
  existing?: 'ACTIVE' | 'FROZEN' | 'BLOCKED' | null,
): 'ACTIVE' | 'FROZEN' | 'BLOCKED' {
  if (existing === 'FROZEN') return 'FROZEN';
  if (blockedAt) return 'BLOCKED';
  return 'ACTIVE';
}

export function planUserMigration(
  source: SourceUser,
  target: TargetUser | null,
): MigrateAction {
  const passwordAlgo = detectPasswordAlgo(
    source.passwordHash,
    source.passwordAlgo,
  );
  const status = statusFromBlockedAt(source.blockedAt, source.status);

  if (!target) {
    return {
      action: 'create',
      data: {
        id: source.id,
        login: source.login,
        email: source.email,
        phone: source.phone,
        passwordHash: source.passwordHash,
        passwordAlgo,
        status,
        blockedAt: source.blockedAt,
        deletedAt: source.deletedAt,
        displayName: source.displayName,
        firstName: source.firstName,
        lastName: source.lastName,
        gender: source.gender,
        birthDate: source.birthDate,
        timezone: source.timezone,
        avatarUrl: source.avatarUrl,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
        telegramId: source.telegramId ?? null,
        telegramUsername: source.telegramUsername ?? null,
        registrationIp: source.registrationIp ?? null,
        sandboxUntil: source.sandboxUntil ?? null,
        lastLoginAt: source.lastLoginAt ?? null,
      },
    };
  }

  const data: {
    passwordAlgo?: 'bcrypt';
    status?: 'ACTIVE' | 'FROZEN' | 'BLOCKED';
    blockedAt?: Date | null;
  } = {};

  // Never downgrade argon2id → bcrypt
  if (target.passwordAlgo !== 'argon2id' && passwordAlgo === 'bcrypt') {
    if (target.passwordAlgo !== 'bcrypt') {
      data.passwordAlgo = 'bcrypt';
    }
  }

  const desiredStatus = statusFromBlockedAt(source.blockedAt, target.status);
  if (target.status !== desiredStatus) {
    data.status = desiredStatus;
  }
  if (
    (source.blockedAt?.getTime() ?? null) !==
    (target.blockedAt?.getTime() ?? null)
  ) {
    data.blockedAt = source.blockedAt;
  }

  if (Object.keys(data).length === 0) {
    return { action: 'skip', reason: 'already_migrated' };
  }

  return { action: 'update', id: target.id, data };
}

export type MigrateReport = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
};
