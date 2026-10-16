import { parseEnv } from './env.schema';

const privatePem =
  '-----BEGIN PRIVATE KEY-----\\nMC4CAQAwBQYDK2VwBCIEICsFi1tH50JAf71mzEkfCrAlO3fb3nVSyk2qOmN+01a6\\n-----END PRIVATE KEY-----\\n';
const publicPem =
  '-----BEGIN PUBLIC KEY-----\\nMCowBQYDK2VwAyEAu6bmA3gj+xwxfU+ZoOjXhnhujeQBxB4Gi4sDOhDjHfE=\\n-----END PUBLIC KEY-----\\n';

function baseEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    NODE_ENV: 'test',
    PORT: '3100',
    DATABASE_URL: 'postgresql://pnk:pnk@127.0.0.1:5432/pnk_id_test',
    APP_URL: 'http://localhost:3100',
    COOKIE_DOMAIN: 'localhost',
    CORS_ORIGINS: 'http://localhost:3100',
    TRUSTED_PROXIES: '127.0.0.1',
    TURNSTILE_SECRET_KEY: 'test-turnstile',
    TELEGRAM_BOT_TOKEN: '1:test',
    TELEGRAM_BOT_USERNAME: 'pnk_id_bot',
    TELEGRAM_WEBHOOK_SECRET: 'whsec',
    TELEGRAM_ADMIN_CHAT_ID: '1',
    JWT_ACTIVE_KID: 'dev-1',
    JWT_PRIVATE_KEYS: JSON.stringify({ 'dev-1': privatePem }),
    JWT_PUBLIC_KEYS: JSON.stringify({ 'dev-1': publicPem }),
    RESERVED_USERNAMES: 'admin,root',
    ...overrides,
  };
}

describe('parseEnv', () => {
  it('parses a complete env', () => {
    const env = parseEnv(baseEnv());
    expect(env.PORT).toBe(3100);
    expect(env.JWT_ISSUER).toBe('http://localhost:3100');
    expect(env.JWT_PRIVATE_KEYS['dev-1']).toContain('BEGIN PRIVATE KEY');
    expect(env.RESERVED_USERNAMES).toEqual(['admin', 'root']);
  });

  it('fails when DATABASE_URL is missing', () => {
    expect(() => parseEnv(baseEnv({ DATABASE_URL: undefined }))).toThrow(
      /DATABASE_URL/,
    );
  });

  it('fails when active kid is missing from keys', () => {
    expect(() =>
      parseEnv(
        baseEnv({
          JWT_ACTIVE_KID: 'missing',
        }),
      ),
    ).toThrow(/JWT_ACTIVE_KID/);
  });
});
