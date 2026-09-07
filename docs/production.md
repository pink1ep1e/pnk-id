# pnk ID — production notes

Стек поднимается из **pnk-mail** (`docker compose`), этот репозиторий — образ `pnk-id`.

Полная инструкция: в sibling-репо `pnk-mail/docs/production.md`.

## Локально с Postgres

```bash
cp .env.example .env
# DATABASE_URL=postgresql://pnk:...@localhost:5432/pnk_id?schema=public
npx prisma db push
npm run db:seed
npm run dev
```

## Тесты

```bash
npm test
```

## Git

```bash
git add -A
git status   # без .env / *.db
git commit -m "Prepare production: PostgreSQL, Docker, rate limits, security tests."
git push -u origin HEAD
```
