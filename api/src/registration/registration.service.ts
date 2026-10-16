import { HttpStatus, Injectable } from '@nestjs/common';
import {
  PendingRegistrationStatus,
  RegistrationAttemptResult,
} from '@prisma/client';
import type { FastifyReply } from 'fastify';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../auth/token.service';
import { CaptchaService } from '../captcha/captcha.service';
import { ApiError } from '../common/http/api-error';
import { serializeCookie } from '../common/utils/cookie';
import {
  hashPasswordArgon2,
  randomToken,
  safeEqualHex,
  sha256Hex,
} from '../common/utils/crypto';
import { isSuspiciousIp } from '../common/utils/get-client-ip';
import { normalizeUsername, validateUsername } from '../common/utils/username';
import { AppConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';
import { ServicesService } from '../services/services.service';
import {
  TelegramService,
  type PendingPayload,
} from '../telegram/telegram.service';
import {
  canAttemptCode,
  canResendCode,
  isCodeExpired,
  PENDING_TTL_MS,
} from './registration-code';
import type {
  RegisterResendDto,
  RegisterStartDto,
  RegisterVerifyDto,
} from './registration.dto';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly captcha: CaptchaService,
    private readonly rateLimit: RateLimitService,
    private readonly services: ServicesService,
    private readonly telegram: TelegramService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async start(
    dto: RegisterStartDto,
    ip: string,
    userAgent?: string,
  ): Promise<{ pendingId: string; telegramDeepLink: string }> {
    if (isSuspiciousIp(ip)) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.START_REJECTED,
        username: dto.username,
      });
      throw new ApiError(
        'forbidden',
        'Registration unavailable',
        HttpStatus.FORBIDDEN,
      );
    }

    const limit = await this.rateLimit.assertCanStart(ip);
    if (!limit.ok) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.START_REJECTED,
        username: dto.username,
      });
      throw new ApiError(
        'rate_limited',
        'Too many attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const captchaOk = await this.captcha.verifyTurnstile(
      dto.turnstileToken,
      ip,
    );
    if (!captchaOk) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.START_REJECTED,
        username: dto.username,
      });
      throw new ApiError('captcha_failed', 'Captcha verification failed');
    }

    const username = normalizeUsername(dto.username);
    const usernameError = validateUsername(
      username,
      this.config.raw.RESERVED_USERNAMES,
    );
    if (usernameError) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.START_REJECTED,
        username,
      });
      throw new ApiError('invalid_username', 'Invalid username');
    }

    if (
      !(await this.services.isRedirectAllowed(dto.service, dto.redirectUri))
    ) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.START_REJECTED,
        username,
      });
      throw new ApiError('invalid_redirect', 'Redirect URI is not allowed');
    }

    const existing = await this.prisma.user.findUnique({
      where: { login: username },
    });
    if (existing) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.START_REJECTED,
        username,
      });
      // Same message as generic failure — no account enumeration
      throw new ApiError('registration_failed', 'Unable to start registration');
    }

    const linkToken = randomToken(24);
    const passwordHash = await hashPasswordArgon2(dto.password);
    const payload: PendingPayload = {
      username,
      email: dto.email ?? null,
    };

    const pending = await this.prisma.pendingRegistration.create({
      data: {
        payload,
        passwordHash,
        ip,
        userAgent,
        tgLinkTokenHash: sha256Hex(linkToken),
        expiresAt: new Date(Date.now() + PENDING_TTL_MS),
        serviceSlug: dto.service,
        redirectUri: dto.redirectUri,
      },
    });

    await this.rateLimit.recordAttempt({
      ip,
      result: RegistrationAttemptResult.START_OK,
      username,
    });
    await this.audit.log({
      event: 'registration.start',
      ip,
      userAgent,
      meta: { pendingId: pending.id },
    });

    const bot = this.config.raw.TELEGRAM_BOT_USERNAME.replace(/^@/, '');
    return {
      pendingId: pending.id,
      telegramDeepLink: `https://t.me/${bot}?start=${linkToken}`,
    };
  }

  async verify(
    dto: RegisterVerifyDto,
    ip: string,
    userAgent: string | undefined,
    reply: FastifyReply,
  ) {
    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { id: dto.pendingId },
    });

    if (
      !pending ||
      pending.status !== PendingRegistrationStatus.PENDING ||
      pending.expiresAt.getTime() < Date.now()
    ) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.VERIFY_FAIL,
      });
      throw new ApiError('invalid_code', 'Invalid or expired code');
    }

    const payload = pending.payload as PendingPayload;
    if (!payload.telegramId || !pending.tgCodeHash) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.VERIFY_FAIL,
        username: payload.username,
      });
      throw new ApiError('telegram_required', 'Confirm Telegram first');
    }

    if (!canAttemptCode(pending.codeAttempts)) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.VERIFY_FAIL,
        username: payload.username,
      });
      throw new ApiError(
        'too_many_attempts',
        'Too many code attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (isCodeExpired(payload.codeExpiresAt)) {
      await this.prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: { codeAttempts: { increment: 1 } },
      });
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.VERIFY_FAIL,
        username: payload.username,
      });
      throw new ApiError('invalid_code', 'Invalid or expired code');
    }

    if (!safeEqualHex(pending.tgCodeHash, sha256Hex(dto.code))) {
      await this.prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: { codeAttempts: { increment: 1 } },
      });
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.VERIFY_FAIL,
        username: payload.username,
      });
      throw new ApiError('invalid_code', 'Invalid or expired code');
    }

    const tgId = BigInt(payload.telegramId);
    const existingTg = await this.prisma.user.findFirst({
      where: { telegramId: tgId },
    });
    if (existingTg) {
      throw new ApiError('telegram_taken', 'Telegram already linked');
    }

    const now = new Date();
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          login: payload.username,
          email: payload.email ?? undefined,
          passwordHash: pending.passwordHash,
          passwordAlgo: 'argon2id',
          telegramId: tgId,
          telegramUsername: payload.telegramUsername ?? undefined,
          status: 'ACTIVE',
          registrationIp: pending.ip,
          sandboxUntil: new Date(now.getTime() + 72 * 60 * 60 * 1000),
          lastLoginAt: now,
        },
      });

      await tx.pendingRegistration.update({
        where: { id: pending.id },
        data: { status: PendingRegistrationStatus.VERIFIED },
      });

      return created;
    });

    const session = await this.tokens.createSession({
      userId: user.id,
      ip,
      userAgent,
    });
    const accessToken = await this.tokens.signAccess(
      user.id,
      pending.serviceSlug ?? undefined,
    );

    const cookieOpts = this.tokens.refreshCookieOptions();
    reply.header(
      'Set-Cookie',
      serializeCookie('pnk_id_refresh', session.refreshToken, cookieOpts),
    );

    await this.rateLimit.recordAttempt({
      ip,
      result: RegistrationAttemptResult.VERIFY_OK,
      username: user.login,
    });
    await this.audit.log({
      event: 'registration.verify',
      userId: user.id,
      ip,
      userAgent,
    });

    return {
      ok: true as const,
      data: {
        accessToken,
        user: {
          id: user.id,
          username: user.login,
          email: user.email,
          sandboxUntil: user.sandboxUntil,
        },
        redirectUri: pending.redirectUri,
      },
    };
  }

  async resend(dto: RegisterResendDto, ip: string, userAgent?: string) {
    const captchaOk = await this.captcha.verifyTurnstile(
      dto.turnstileToken,
      ip,
    );
    if (!captchaOk) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.RESEND_REJECTED,
      });
      throw new ApiError('captcha_failed', 'Captcha verification failed');
    }

    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { id: dto.pendingId },
    });
    if (
      !pending ||
      pending.status !== PendingRegistrationStatus.PENDING ||
      pending.expiresAt.getTime() < Date.now()
    ) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.RESEND_REJECTED,
      });
      throw new ApiError('not_found', 'Registration not found');
    }

    const payload = pending.payload as PendingPayload;
    if (!payload.telegramId) {
      throw new ApiError('telegram_required', 'Confirm Telegram first');
    }

    const resend = canResendCode({
      codeSentCount: pending.codeSentCount,
      lastCodeSentAt: pending.lastCodeSentAt,
    });
    if (!resend.ok) {
      await this.rateLimit.recordAttempt({
        ip,
        result: RegistrationAttemptResult.RESEND_REJECTED,
        username: payload.username,
      });
      throw new ApiError(
        resend.reason,
        'Cannot resend code now',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.telegram.resendCode(pending.id);
    await this.rateLimit.recordAttempt({
      ip,
      result: RegistrationAttemptResult.RESEND_OK,
      username: payload.username,
    });
    await this.audit.log({
      event: 'registration.resend',
      ip,
      userAgent,
      meta: { pendingId: pending.id },
    });

    return { ok: true as const, data: { sent: true } };
  }
}
