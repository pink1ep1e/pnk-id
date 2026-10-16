# Integration examples

## JWKS verification (pnk-mail / other PNK services)

1. Trust `GET https://id.pnkmail.ru/.well-known/jwks.json` (cache via `jose` remote JWKS).
2. Verify `Authorization: Bearer <access>` with algorithm **EdDSA**, issuer = ID `APP_URL`.
3. Use `sub` as pnk ID user id. In mail DB keep `mailbox.pnkIdUserId` (or equivalent).
4. Do **not** send the refresh cookie to mail; refresh stays on `id.pnkmail.ru` (`Path=/v1`).
5. For `sandboxUntil`, call `GET /v1/me` once after login (or cache it).

Files:
- `pnk-id-jwks.nest.guard.ts` — Nest guard
- `pnk-id-jwks.next.ts` — Next.js helper

## User migration

```bash
cd api
npx tsx scripts/migrate-users.ts --dry-run
npx tsx scripts/migrate-users.ts
```

Optional: `SOURCE_DATABASE_URL` if copying from another Postgres into `DATABASE_URL`.
