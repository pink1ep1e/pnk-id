process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3100';
process.env.DATABASE_URL ??=
  'postgresql://pnk:pnk@127.0.0.1:5432/pnk_id_test?schema=public';
process.env.APP_URL ??= 'http://localhost:3100';
process.env.COOKIE_DOMAIN ??= 'localhost';
process.env.CORS_ORIGINS ??= 'http://localhost:3100';
process.env.TRUSTED_PROXIES ??= '127.0.0.1';
process.env.TURNSTILE_SECRET_KEY ??= 'test-turnstile';
process.env.TELEGRAM_BOT_TOKEN ??= '1:test';
process.env.TELEGRAM_BOT_USERNAME ??= 'pnk_id_bot';
process.env.TELEGRAM_WEBHOOK_SECRET ??= 'whsec';
process.env.TELEGRAM_ADMIN_CHAT_ID ??= '1';
process.env.JWT_ACTIVE_KID ??= 'dev-1';
process.env.JWT_PRIVATE_KEYS ??= JSON.stringify({
  'dev-1':
    '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEICsFi1tH50JAf71mzEkfCrAlO3fb3nVSyk2qOmN+01a6\n-----END PRIVATE KEY-----\n',
});
process.env.JWT_PUBLIC_KEYS ??= JSON.stringify({
  'dev-1':
    '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAu6bmA3gj+xwxfU+ZoOjXhnhujeQBxB4Gi4sDOhDjHfE=\n-----END PUBLIC KEY-----\n',
});
