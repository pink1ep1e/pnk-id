# pnk ID

Единый identity provider для экосистемы pnk (аналог Сбер ID / Т‑Банк ID / Google Account).

Отдельный проект от `pnk-mail`. Почта подключится позже через OAuth2.

## Стек

- Next.js 15 (App Router) + API routes
- Prisma + SQLite (локально)
- bcryptjs (пароли), jose (JWT access tokens)
- HttpOnly cookie-сессии
- OAuth2 Authorization Code (+ PKCE) для сервисов
- QR-вход (challenge → confirm → claim session)

## Быстрый старт

```bash
cd f:\pnk-id
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Откройте http://localhost:3100

Демо-аккаунт после seed:

- логин: `demo`
- пароль: `password123`

OAuth-клиент для почты:

- `client_id`: `pnk-mail`
- `client_secret`: `pnk-mail-dev-secret`
- redirect: `http://localhost:3000/oauth/callback`

## API

### Auth

| Method | Path | Описание |
|--------|------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/logout` | Выход |
| GET | `/api/auth/me` | Текущий пользователь |
| POST | `/api/auth/qr` | Создать QR challenge |
| GET | `/api/auth/qr?code=` | Статус QR |
| PUT | `/api/auth/qr` | Скан/подтверждение (телефон) |
| PATCH | `/api/auth/qr` | Получить сессию на десктопе |

### Profile / security

| Method | Path | Описание |
|--------|------|----------|
| GET/PATCH | `/api/profile` | Профиль |
| POST | `/api/security/password` | Смена пароля |
| GET/DELETE | `/api/security/sessions` | Сессии |
| GET/DELETE | `/api/apps` | Подключённые приложения |
| GET/POST | `/api/support/messages` | Чат поддержки |

### OAuth2 (для pnk Mail и других сервисов)

1. Пользователь логинится в pnk ID
2. Сервис редиректит на `/oauth/consent?client_id=pnk-mail&redirect_uri=...&scope=openid profile email`
3. `POST /api/oauth/authorize` → `code`
4. Сервис: `POST /api/oauth/token` с `grant_type=authorization_code`
5. `GET /api/oauth/userinfo` с `Authorization: Bearer <access_token>`

Scopes: `openid`, `profile`, `email`, `phone`

## Подключение нового сервиса

1. Добавьте запись `OAuthClient` в БД (или через seed)
2. Укажите `redirectUris` и `scopes`
3. На стороне сервиса реализуйте callback + обмен code→token
4. Храните refresh_token и запрашивайте userinfo

## Безопасность (локальный baseline)

- Пароли: bcrypt cost 12
- Сессии: opaque token, в БД только SHA-256 hash
- Access token: короткоживущий JWT (1ч)
- Refresh token: hash в БД, revoke при отзыве приложения
- Cookie: HttpOnly, SameSite=Lax
- QR: TTL 60с, одноразовый claim

Перед продом смените `SESSION_SECRET` / `JWT_SECRET` в `.env`.
