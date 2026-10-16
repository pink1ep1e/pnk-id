import { z } from 'zod';

const csv = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );

/** Parse JSON object of PEM strings. Handles dotenv expanding \\n inside "double quotes". */
function parseJsonStringRecord(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // dotenv: JWT_PRIVATE_KEYS="...\\n..." → real newlines → invalid JSON
    return JSON.parse(raw.replace(/\r?\n/g, '\\n'));
  }
}

const jsonStringRecord = z.string().transform((raw, ctx) => {
  try {
    const parsed: unknown = parseJsonStringRecord(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Expected JSON object of string values',
      });
      return z.NEVER;
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v !== 'string') {
        ctx.addIssue({
          code: 'custom',
          message: `Key ${k} must be a string`,
        });
        return z.NEVER;
      }
      out[k] = v.replace(/\\n/g, '\n');
    }
    return out;
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
    return z.NEVER;
  }
});

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3100),
    DATABASE_URL: z.string().min(1),
    APP_URL: z.string().url(),
    JWT_ISSUER: z.string().url().optional(),
    COOKIE_DOMAIN: z.string().min(1).default('.pnkmail.ru'),
    CORS_ORIGINS: csv('https://id.pnkmail.ru,https://pnkmail.ru'),
    TRUSTED_PROXIES: csv('127.0.0.1'),
    TURNSTILE_SECRET_KEY: z.string().min(1),
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    TELEGRAM_BOT_USERNAME: z.string().min(1),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
    TELEGRAM_ADMIN_CHAT_ID: z.string().min(1),
    JWT_ACTIVE_KID: z.string().min(1),
    JWT_PRIVATE_KEYS: jsonStringRecord,
    JWT_PUBLIC_KEYS: jsonStringRecord,
    RESERVED_USERNAMES: csv(
      'admin,support,info,root,postmaster,abuse,noreply,security,billing,pnk,pnkmail,mail,webmaster,help,null,undefined',
    ),
  })
  .superRefine((data, ctx) => {
    if (!(data.JWT_ACTIVE_KID in data.JWT_PRIVATE_KEYS)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACTIVE_KID'],
        message: 'JWT_ACTIVE_KID must exist in JWT_PRIVATE_KEYS',
      });
    }
    if (!(data.JWT_ACTIVE_KID in data.JWT_PUBLIC_KEYS)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACTIVE_KID'],
        message: 'JWT_ACTIVE_KID must exist in JWT_PUBLIC_KEYS',
      });
    }
    for (const kid of Object.keys(data.JWT_PRIVATE_KEYS)) {
      if (!(kid in data.JWT_PUBLIC_KEYS)) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_PUBLIC_KEYS'],
          message: `Missing public key for kid ${kid}`,
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    JWT_ISSUER: data.JWT_ISSUER ?? data.APP_URL,
  }));

export type Env = z.infer<typeof envSchema>;

export function parseEnv(
  raw: Record<string, string | undefined> = process.env,
): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}
