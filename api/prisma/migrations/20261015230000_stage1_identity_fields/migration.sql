-- Stage 1: additive identity fields for Nest API (Telegram registration, refresh sessions)

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'FROZEN', 'BLOCKED');
CREATE TYPE "PasswordAlgo" AS ENUM ('argon2id', 'bcrypt');
CREATE TYPE "PendingRegistrationStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "RegistrationAttemptResult" AS ENUM (
  'START_OK',
  'START_REJECTED',
  'VERIFY_OK',
  'VERIFY_FAIL',
  'RESEND_OK',
  'RESEND_REJECTED'
);

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "passwordAlgo" "PasswordAlgo" NOT NULL DEFAULT 'bcrypt',
  ADD COLUMN IF NOT EXISTS "telegramId" BIGINT,
  ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "registrationIp" TEXT,
  ADD COLUMN IF NOT EXISTS "sandboxUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramId_key" ON "User"("telegramId");

ALTER TABLE "Session" ALTER COLUMN "tokenHash" DROP NOT NULL;

ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "refreshHash" TEXT,
  ADD COLUMN IF NOT EXISTS "familyId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Session_refreshHash_key" ON "Session"("refreshHash");
CREATE INDEX IF NOT EXISTS "Session_familyId_idx" ON "Session"("familyId");
CREATE INDEX IF NOT EXISTS "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

CREATE TABLE IF NOT EXISTS "Service" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "allowedRedirectUris" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Service_slug_key" ON "Service"("slug");

CREATE TABLE IF NOT EXISTS "PendingRegistration" (
  "id" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "userAgent" TEXT,
  "tgLinkTokenHash" TEXT NOT NULL,
  "tgCodeHash" TEXT,
  "codeAttempts" INTEGER NOT NULL DEFAULT 0,
  "codeSentCount" INTEGER NOT NULL DEFAULT 0,
  "lastCodeSentAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" "PendingRegistrationStatus" NOT NULL DEFAULT 'PENDING',
  "serviceSlug" TEXT,
  "redirectUri" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PendingRegistration_tgLinkTokenHash_key" ON "PendingRegistration"("tgLinkTokenHash");
CREATE INDEX IF NOT EXISTS "PendingRegistration_ip_createdAt_idx" ON "PendingRegistration"("ip", "createdAt");
CREATE INDEX IF NOT EXISTS "PendingRegistration_expiresAt_idx" ON "PendingRegistration"("expiresAt");

CREATE TABLE IF NOT EXISTS "RegistrationAttempt" (
  "id" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "subnet" TEXT NOT NULL,
  "result" "RegistrationAttemptResult" NOT NULL,
  "username" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RegistrationAttempt_ip_createdAt_idx" ON "RegistrationAttempt"("ip", "createdAt");
CREATE INDEX IF NOT EXISTS "RegistrationAttempt_subnet_createdAt_idx" ON "RegistrationAttempt"("subnet", "createdAt");

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "event" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_ip_createdAt_idx" ON "AuditLog"("ip", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

ALTER TABLE "AuditLog"
  DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey",
  ADD CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
