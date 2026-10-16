import { TokenService } from './token.service';

const privatePem =
  '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEICsFi1tH50JAf71mzEkfCrAlO3fb3nVSyk2qOmN+01a6\n-----END PRIVATE KEY-----\n';
const publicPem =
  '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAu6bmA3gj+xwxfU+ZoOjXhnhujeQBxB4Gi4sDOhDjHfE=\n-----END PUBLIC KEY-----\n';

describe('TokenService', () => {
  it('signs and verifies access JWT with kid', async () => {
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
    const prisma = {
      session: { create: jest.fn() },
    };
    const tokens = new TokenService(config as never, prisma as never);
    await tokens.onModuleInit();

    const jwt = await tokens.signAccess('user_1', 'mail');
    const payload = await tokens.verifyAccess(jwt);
    expect(payload.sub).toBe('user_1');
    expect(payload.svc).toBe('mail');
    expect(tokens.jwks().keys[0]?.kid).toBe('dev-1');
  });
});
