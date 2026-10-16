# pnk-id-api

NestJS + Fastify identity API for PNK (`id.pnkmail.ru`).  
Frontend stays in the repo root (Next.js). Architecture: [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

## Requirements

- Node.js 22+
- PostgreSQL
- Cloudflare Turnstile + Telegram bot (registration)

## Quick start (dev)

```bash
cd api
cp .env.example .env   # fill secrets
npm ci
npx prisma generate
npx prisma migrate deploy
npm run start:dev
# GET http://localhost:3100/health
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run start:dev` | Watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | `node dist/main` |
| `npm run lint` / `typecheck` / `test` / `test:e2e` | Quality gate |
| `npm run prisma:migrate` | Apply migrations |
| `npm run migrate:users:dry` | Dry-run user backfill |
| `npm run migrate:users` | Apply user backfill |

## Environment

See [`.env.example`](.env.example). App **refuses to start** if validation fails.

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | yes | Postgres |
| `APP_URL` | yes | Public URL, e.g. `https://id.pnkmail.ru` |
| `JWT_ISSUER` | no | Defaults to `APP_URL` |
| `PORT` | no | Default `3100` |
| `COOKIE_DOMAIN` | yes | Prod: `.pnkmail.ru` |
| `CORS_ORIGINS` | yes | CSV, e.g. `https://id.pnkmail.ru,https://pnkmail.ru` |
| `TRUSTED_PROXIES` | yes | CSV; Nginx `127.0.0.1` |
| `TURNSTILE_SECRET_KEY` | yes | `dev-` / `test-` prefix bypasses verify in non-prod |
| `TELEGRAM_BOT_TOKEN` | yes | |
| `TELEGRAM_BOT_USERNAME` | yes | Without `@` |
| `TELEGRAM_WEBHOOK_SECRET` | yes | Header `X-Telegram-Bot-Api-Secret-Token` |
| `TELEGRAM_ADMIN_CHAT_ID` | yes | Rate-limit alerts |
| `JWT_ACTIVE_KID` | yes | Active signing key id |
| `JWT_PRIVATE_KEYS` | yes | JSON `{ "kid": "PEM with \\n" }` |
| `JWT_PUBLIC_KEYS` | yes | Matching public PEMs |
| `RESERVED_USERNAMES` | no | CSV denylist |
| `SOURCE_DATABASE_URL` | no | Only for `migrate:users` cross-DB copy |
| `NODE_ENV` | no | `development` \| `test` \| `production` |

Generate Ed25519 keys:

```bash
node -e "const {generateKeyPairSync}=require('crypto'); const {privateKey,publicKey}=generateKeyPairSync('ed25519'); console.log(privateKey.export({type:'pkcs8',format:'pem'})); console.log(publicKey.export({type:'spki',format:'pem'}));"
```

Put PEMs into JSON with `\n` escapes (see `.env.example`).

## API surface (v1)

| Method | Path |
|--------|------|
| POST | `/v1/register/start` \| `/verify` \| `/resend-code` |
| POST | `/v1/login` \| `/refresh` \| `/logout` \| `/logout-all` |
| GET/PATCH | `/v1/me` |
| POST | `/v1/me/password` |
| GET/DELETE | `/v1/sessions` \| `/v1/sessions/:id` |
| POST | `/telegram/webhook` |
| GET | `/.well-known/jwks.json` |
| GET | `/health` |

JSON envelope: `{ ok: true, data }` / `{ ok: false, error: { code, message } }`.  
Access JWT in JSON body; refresh in HttpOnly cookie `pnk_id_refresh` (`Path=/v1`, `Domain=.pnkmail.ru`).

## Deploy (VPS + PM2 + Nginx)

### 1. Code & build

```bash
cd /path/to/pnk-id/api
git pull
npm ci
npx prisma generate
npx prisma migrate deploy
# optional first cutover:
# npm run migrate:users:dry && npm run migrate:users
npm run build
```

### 2. Env

```bash
cp .env.example .env
nano .env
# APP_URL=https://id.pnkmail.ru
# COOKIE_DOMAIN=.pnkmail.ru
# CORS_ORIGINS=https://id.pnkmail.ru,https://pnkmail.ru
# TRUSTED_PROXIES=127.0.0.1
# production JWT keys (not the example PEMs)
```

### 3. PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # run the command it prints
pm2 logs pnk-id-api --lines 50
curl -s http://127.0.0.1:3100/health
```

Restart after deploys: `pm2 restart pnk-id-api`.

### 4. Nginx

Example: [`deploy/nginx.id.pnkmail.ru.conf`](deploy/nginx.id.pnkmail.ru.conf).

- Nest API: `127.0.0.1:3100` — `/v1`, `/.well-known`, `/health`, `/telegram/webhook`
- Next UI: `127.0.0.1:3101` (or keep current Next on 3100 until cutover, then move UI)

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d id.pnkmail.ru
```

### 5. Telegram webhook

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://id.pnkmail.ru/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

### 6. Cutover checklist

- [ ] Migrations applied on production DB
- [ ] `migrate:users` dry-run then apply (if backfilling status/algo)
- [ ] Env production secrets set; app starts (`pm2 logs` clean)
- [ ] `/health` and `/.well-known/jwks.json` OK via HTTPS
- [ ] Nginx routes `/v1` → API; UI still works
- [ ] Turnstile + Telegram registration smoke test
- [ ] Login / refresh cookie on `.pnkmail.ru`
- [ ] pnk-mail verifies JWT via JWKS (`examples/`)

## Integration (mail / other services)

See [`examples/README.md`](examples/README.md).

## License

Private — PNK.
