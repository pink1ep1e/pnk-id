# pnk ID — NestJS backend architecture

Отдельный бэкенд Identity Provider для сервисов PNK (почта `pnkmail.ru` и др.).  
Фронтенд остаётся Next.js (`id.pnkmail.ru`), API переезжает на NestJS + Fastify.

**Репозиторий:** новый пакет `api/` в этом же репо (фронт в корне / позже `web/`).  
**Порт API:** `3100` (как сейчас), Nginx проксирует `id.pnkmail.ru` → Nest; Next отдаёт только UI (отдельный процесс или тот же хост на другом порту — см. этап 6).

---

## 1. Цели и границы v1

### Делаем
- Регистрация только через Telegram (код + Turnstile + rate limits).
- Логин / refresh / logout / logout-all.
- JWT access (EdDSA, 10 мин) + opaque refresh (cookie `.pnkmail.ru`).
- JWKS, профиль, смена пароля, список сессий.
- Миграция пользователей из текущей БД без сброса паролей.
- Аудит и health.

### Не делаем в v1 (оставляем в старой схеме / откладываем)
- OAuth2 authorize/token/userinfo, PKCE, consent UI.
- QR-логин, recovery emails, support chat, admin API для PMP.
- Soft-delete UI / удаление аккаунта.

Таблицы `OAuthClient`, `AuthCode`, `RefreshToken` (OAuth), `QrChallenge`, `RecoveryEmail`, `SupportMessage`, `AppConsent` **не удаляем** — аддитивные миграции только. После стабилизации API их можно перенести отдельным этапом.

### Допущения
1. Валидация: **zod + nestjs-zod** (один стиль DTO + OpenAPI-friendly).
2. Telegram-бот: **grammY** (webhook adapter), минимум своего кода вокруг Bot API.
3. Поле логина в БД остаётся `User.login` (как сейчас); в API и доке — `username` (= `login`, всегда lowercase).
4. Статус: новое поле `status` (`ACTIVE` | `FROZEN` | `BLOCKED`). При миграции: `blockedAt != null` → `BLOCKED`, иначе `ACTIVE`. `blockedAt` сохраняем для совместимости со старым кодом до отключения Next API.
5. Модель `Session` **расширяется** под refresh-семейства (см. схему). Старое поле `tokenHash` остаётся nullable на переходный период; новый поток использует `refreshHash` + `familyId`. Cookie сессии Next (`pnk_id_session`) после cutover не используется API.
6. Таблица `Service` — каталог first-party redirect’ов (`mail` → allowed URIs). `OAuthClient` не трогаем в v1.
7. Access JWT отдаётся в JSON; refresh — только HttpOnly cookie `pnk_id_refresh` на `.pnkmail.ru`.
8. Issuer JWT: `https://id.pnkmail.ru` (env `JWT_ISSUER` / `APP_URL`).
9. Nest и старый Next API не работают одновременно на одном порту; cutover через Nginx.

---

## 2. Структура модулей

```
api/
  prisma/
    schema.prisma          # общая БД с фронтом на время миграции
    migrations/
  src/
    main.ts
    app.module.ts
    config/                # @nestjs/config + zod-схема env
    common/
      filters/
      guards/
      interceptors/
      utils/get-client-ip.ts
      utils/timing.ts
    prisma/                # PrismaModule / PrismaService
    health/
    auth/                  # login, refresh, logout, JWKS, password verify
    registration/          # start / verify / resend
    telegram/              # webhook + отправка кода
    captcha/               # Turnstile siteverify
    rate-limit/            # Guard + сервис лимитов по БД
    users/                 # GET/PATCH /me, password
    sessions/              # list / revoke
    services/              # Service catalog, redirect allowlist
    audit/                 # AuditLog writer
  scripts/
    migrate-users.ts
  test/
    unit/
    e2e/
  ecosystem.config.js
  nest-cli.json
  package.json
```

| Модуль | Ответственность |
|--------|-----------------|
| `config` | Env-валидация при старте; fail-fast |
| `prisma` | Единый клиент |
| `auth` | Login, JWT Ed25519, refresh rotation, JWKS, logout* |
| `registration` | PendingRegistration, коды, создание User |
| `telegram` | Webhook, deep link start, отправка 6-значного кода |
| `captcha` | Cloudflare Turnstile |
| `rate-limit` | Guard + RegistrationAttempt / счётчики |
| `users` | Профиль |
| `sessions` | Список/отзыв refresh-сессий |
| `services` | `Service` + проверка redirect URI |
| `audit` | Запись AuditLog |
| `health` | `GET /health` |

---

## 3. Схема БД (аддитивно к текущей)

Текущие модели `User`, `Session`, … сохраняются. Ниже — изменения и новые сущности.

### 3.1. User — новые / уточнённые поля

| Поле | Тип | Примечание |
|------|-----|------------|
| `login` | String @unique | уже есть; = username |
| `email` | String? @unique | уже есть |
| `passwordHash` | String | уже есть |
| `passwordAlgo` | enum `argon2id` \| `bcrypt` | **новое**, default `bcrypt` для миграции |
| `telegramId` | BigInt? @unique | **новое** |
| `telegramUsername` | String? | **новое** |
| `status` | enum ACTIVE\|FROZEN\|BLOCKED | **новое**, default ACTIVE |
| `registrationIp` | String? | **новое** |
| `sandboxUntil` | DateTime? | **новое**; при создании = now + 72h |
| `lastLoginAt` | DateTime? | **новое** |
| `blockedAt` | DateTime? | уже есть; синхронизируем с `status=BLOCKED` |

Профиль (`displayName`, `firstName`, …) без изменений.

### 3.2. Session — расширение под refresh

| Поле | Тип | Примечание |
|------|-----|------------|
| `id` | cuid | уже есть |
| `userId` | FK | уже есть |
| `refreshHash` | String? @unique | **новое**; SHA-256 opaque refresh |
| `familyId` | String? | **новое**; cuid семейства; reuse → revoke all |
| `tokenHash` | String? @unique | старое; nullable после миграции колонки |
| `userAgent`, `ip` | | уже есть |
| `createdAt`, `lastSeenAt` / `lastUsedAt` | | `lastSeenAt` маппим как lastUsedAt в API |
| `expiresAt`, `revokedAt` | | уже есть |
| device* | | оставляем, API v1 может не заполнять |

Индекс: `(userId, revokedAt)`, `(familyId)`.

### 3.3. Новые модели

```
PendingRegistration
  id, payload (Json — без plaintext password),
  passwordHash, ip, userAgent,
  tgLinkTokenHash, tgCodeHash,
  codeAttempts, codeSentCount, lastCodeSentAt,
  expiresAt, status (PENDING|VERIFIED|EXPIRED|CANCELLED),
  serviceSlug?, redirectUri?,
  createdAt

Service
  id, slug @unique, name, allowedRedirectUris (Json string[]),
  createdAt, active

RegistrationAttempt
  id, ip, subnet, result (enum), username?, createdAt
  @@index([ip, createdAt])
  @@index([subnet, createdAt])

AuditLog
  id, userId?, event, ip, userAgent, meta Json?, createdAt
  @@index([ip, createdAt])
  @@index([userId, createdAt])
```

### 3.4. Индексы под лимиты
- `RegistrationAttempt(ip, createdAt)`, `(subnet, createdAt)`.
- При необходимости материализованные счётчики не вводим — считаем `COUNT` по окну.

---

## 4. API (`/v1`, JSON)

Базовый URL: `https://id.pnkmail.ru/v1` (кроме well-known и health).

| Method | Path | Описание |
|--------|------|----------|
| POST | `/v1/register/start` | Форма + Turnstile → PendingRegistration + `t.me/<bot>?start=<token>` |
| POST | `/v1/register/verify` | pendingId + код → User + Session + tokens |
| POST | `/v1/register/resend-code` | Повтор кода (Turnstile + лимиты) |
| POST | `/v1/login` | username/password → access + Set-Cookie refresh |
| POST | `/v1/refresh` | cookie refresh → новый access + ротация refresh |
| POST | `/v1/logout` | отозвать текущую сессию |
| POST | `/v1/logout-all` | отозвать все сессии пользователя |
| GET | `/v1/me` | профиль (Bearer access) |
| PATCH | `/v1/me` | обновление профиля |
| POST | `/v1/me/password` | смена пароля |
| GET | `/v1/sessions` | список сессий |
| DELETE | `/v1/sessions/:id` | отозвать сессию |
| POST | `/telegram/webhook` | grammY + `X-Telegram-Bot-Api-Secret-Token` |
| GET | `/.well-known/jwks.json` | публичные ключи Ed25519 |
| GET | `/health` | liveness |

### Контракты токенов
- **Access:** JWT EdDSA (Ed25519), TTL **10 мин**, заголовок `kid`, claims: `sub` (userId), `iss`, `iat`, `exp`, опционально `svc` (service slug).
- **Refresh:** `crypto.randomBytes(32)` → base64url; в БД только SHA-256; cookie `pnk_id_refresh`, `HttpOnly; Secure; SameSite=Lax; Domain=.pnkmail.ru; Path=/v1/refresh` (или `/v1` — зафиксируем в реализации Path=`/v1`).
- Ротация на каждый `/refresh`; повтор использованного refresh → revoke всего `familyId` + audit.

### Redirect / service
- Query/body `service` (например `mail`) + опциональный `redirect_uri`.
- После login/verify: redirect только если URI ∈ `Service.allowedRedirectUris` для slug; иначе ошибка без open redirect.

### Ошибки
Единый формат: `{ "ok": false, "error": { "code": "...", "message": "..." } }`  
Успех: `{ "ok": true, "data": { ... } }`  
Сообщения логина/регистрации не раскрывают существование аккаунта.

---

## 5. Защита регистрации

1. Аккаунт только после верного Telegram-кода; `telegramId` уникален.
2. Код: `crypto.randomInt(0, 1e6)` → 6 цифр; в БД HMAC/SHA-256 хеш; TTL **10 мин**; **5** попыток; resend ≥ **60 с**, ≤ **3** раза на pending.
3. Deep-link token: одноразовый, TTL **15 мин**, в БД только хеш.
4. Turnstile на `start` и `resend-code` (siteverify + IP).
5. Rate limit (БД, Guard):
   - IP: 2 успешные регистрации / сутки, 5 / неделю;
   - IP: 10 попыток формы (`start`) / час;
   - subnet /24 (v4) или /48 (v6): 5 успешных / сутки.
6. `getClientIp`: только из `X-Forwarded-For` при доверенном hop (`TRUSTED_PROXIES` + Fastify `trustProxy`).
7. Reserved usernames из env/config; правила: `[a-z0-9._-]`, 4–30, lowercase, без двух спецсимволов подряд.
8. `isSuspiciousIp(ip): boolean` — заглушка `false` + TODO.
9. `sandboxUntil = createdAt + 72h`.
10. Алерт админу в Telegram при ≥5 неудачных попытках с IP за час (`TELEGRAM_ADMIN_CHAT_ID`).

---

## 6. Безопасность (общее)

- Фиктивный argon2/bcrypt verify при неизвестном пользователе (выравнивание времени).
- Login rate limit: по IP и по username; нарастающая задержка (sleep) после N неудач.
- `@fastify/helmet`, CORS: `https://id.pnkmail.ru`, `https://pnkmail.ru` (+ localhost в dev).
- `@fastify/cookie`.
- JWT private keys: файл `JWT_PRIVATE_KEYS_PATH` или env PEM; несколько ключей в JWKS (активный `kid` для подписи).
- Global ZodValidationPipe: strip unknown / reject extra.
- Логи pino: redaction password, code, token, authorization, cookie.

---

## 7. Интеграция сервиса почты (JWKS)

Почта **не** ходит в ID за проверкой access на каждый запрос.

```
pnk-mail                         id.pnkmail.ru
   |                                  |
   |  GET /.well-known/jwks.json      |
   |<---------------------------------|
   |  Authorization: Bearer <access>  |
   |  verify EdDSA via jose + JWKS    |
   |  sub = userId → привязка ящика   |
```

- Ящики остаются в БД почты; связь: `mailbox.pnkIdUserId = access.sub` (или существующее поле — уточнить в pnk-mail при этапе 5).
- Пример guard (псевдокод) — в этапе 5: `jose.createRemoteJWKSet(new URL('https://id.pnkmail.ru/.well-known/jwks.json'))` + `jwtVerify`.
- Refresh cookie на `.pnkmail.ru` позволяет id и mail при необходимости шарить домен cookie только для refresh endpoint ID (mail access не читает эту cookie).

`sandboxUntil` почта читает из `/v1/me` или из claim (если добавим позже); в v1 — из `/me` при логине в mail.

---

## 8. Миграция пользователей

`api/scripts/migrate-users.ts`:
- Читает пользователей из той же БД (или `SOURCE_DATABASE_URL`).
- Для каждой записи: выставляет `passwordAlgo=bcrypt`, `status` из `blockedAt`, не трогает `passwordHash`.
- Идемпотентно (по `id` / `login`).
- Флаг `--dry-run`, отчёт: total / updated / skipped / errors.
- Telegram-поля пустые до линковки пользователем (вне v1 UX) или остаются null.

Новые регистрации пишут `argon2id`. При логине со старым bcrypt — verify → rehash argon2id → обновить `passwordAlgo`.

---

## 9. Конфиг (env, обязательные)

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | Postgres |
| `APP_URL` / `JWT_ISSUER` | issuer, публичный URL |
| `PORT` | default 3100 |
| `COOKIE_DOMAIN` | `.pnkmail.ru` |
| `CORS_ORIGINS` | CSV |
| `TRUSTED_PROXIES` | CSV CIDR/IP |
| `TURNSTILE_SECRET_KEY` | |
| `TELEGRAM_BOT_TOKEN` | |
| `TELEGRAM_BOT_USERNAME` | для deep link |
| `TELEGRAM_WEBHOOK_SECRET` | заголовок webhook |
| `TELEGRAM_ADMIN_CHAT_ID` | алерты |
| `JWT_ACTIVE_KID` | |
| `JWT_PRIVATE_KEYS` или path | JSON map kid→PEM |
| `RESERVED_USERNAMES` | CSV |
| `NODE_ENV` | |

Опционально: `TURNSTILE_SITE_KEY` только для фронта (Next env).

Приложение **не стартует**, если zod-схема env невалидна.

---

## 10. Деплой

- Build: `nest build` → `dist/`.
- PM2: `ecosystem.config.js` (`name: pnk-id-api`, `script: dist/main.js`, `instances` по необходимости; rate limit в БД → можно cluster).
- Nginx: `id.pnkmail.ru` → `127.0.0.1:3100`; UI Next — отдельный upstream или тот же server с `location /v1` / `/.well-known` → API.
- Dockerfile — опционально, не обязателен для VPS.

---

## 11. Тесты

**Unit (Vitest или Jest — выберем Jest как default Nest):**
- код регистрации (TTL, attempts, reuse token);
- rate-limit окна;
- refresh rotation + reuse detection;
- username validation;
- JWT sign/verify + kid.

**E2E:** тестовая Postgres, регистрация (mock Turnstile + mock Telegram send), логин, refresh, logout.

После каждого этапа: `lint`, `tsc --noEmit`, `test`.

---

## 12. Этапы работ

| # | Содержание | Критерий готовности |
|---|------------|---------------------|
| 1 | Этот документ + каркас Nest + config + Prisma-миграции + `/health` | lint/tsc/test green; health 200 |
| 2 | Регистрация + Telegram + Turnstile + лимиты + audit | e2e register happy-path |
| 3 | Login, JWT, refresh rotation, sessions, JWKS | unit + e2e login/refresh |
| 4 | `/me`, password, logout* | e2e |
| 5 | `migrate-users` + пример JWKS-guard для mail/Next | dry-run отчёт |
| 6 | PM2, Nginx example, README env | деплой-чеклист — см. `api/README.md`, `api/deploy/`, `api/ecosystem.config.js` |

---

## 13. Что нужно подтвердить («ок»)

1. Пакет API в `api/` этого репо — ок?
2. OAuth/QR/admin вне v1 — ок?
3. Имя refresh-cookie `pnk_id_refresh`, domain `.pnkmail.ru` — ок?
4. Сохраняем JSON-envelope `{ ok, data | error }` как у текущего фронта — ок?

После вашего **ок** начинаю этап 1 (каркас, без бизнес-логики регистрации).
