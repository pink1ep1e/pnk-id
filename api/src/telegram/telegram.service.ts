import { Injectable, Logger } from '@nestjs/common';
import { Bot, type Context } from 'grammy';
import type { Update } from 'grammy/types';
import { PendingRegistrationStatus } from '@prisma/client';
import { AppConfigService } from '../config/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { generateSixDigitCode, sha256Hex } from '../common/utils/crypto';
import { TelegramNotifyService } from './telegram-notify.service';

export type PendingPayload = {
  username: string;
  email?: string | null;
  telegramId?: string;
  telegramUsername?: string | null;
  linkConsumed?: boolean;
  codeExpiresAt?: string;
};

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot | null = null;
  private handlersReady = false;

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notify: TelegramNotifyService,
  ) {}

  getBot(): Bot {
    if (!this.bot) {
      this.bot = new Bot(this.config.raw.TELEGRAM_BOT_TOKEN);
    }
    if (!this.handlersReady) {
      this.bot.command('start', (ctx) => this.onStart(ctx));
      this.handlersReady = true;
    }
    return this.bot;
  }

  async handleUpdate(update: Update): Promise<void> {
    await this.getBot().handleUpdate(update);
  }

  private async onStart(ctx: Context): Promise<void> {
    const token = ctx.match?.toString().trim();
    const from = ctx.from;
    if (!token || !from) {
      await ctx.reply('Откройте ссылку регистрации с сайта pnk ID.');
      return;
    }

    const pending = await this.prisma.pendingRegistration.findFirst({
      where: {
        tgLinkTokenHash: sha256Hex(token),
        status: PendingRegistrationStatus.PENDING,
      },
    });

    if (!pending || pending.expiresAt.getTime() < Date.now()) {
      await ctx.reply(
        'Ссылка недействительна или истекла. Начните регистрацию заново.',
      );
      return;
    }

    const payload = pending.payload as PendingPayload;
    if (payload.linkConsumed) {
      await ctx.reply('Эта ссылка уже использована.');
      return;
    }

    const existingTg = await this.prisma.user.findFirst({
      where: { telegramId: BigInt(from.id) },
    });
    if (existingTg) {
      await ctx.reply('Этот Telegram уже привязан к аккаунту pnk ID.');
      return;
    }

    const code = generateSixDigitCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        tgCodeHash: sha256Hex(code),
        codeAttempts: 0,
        codeSentCount: 1,
        lastCodeSentAt: new Date(),
        payload: {
          ...payload,
          telegramId: String(from.id),
          telegramUsername: from.username ?? null,
          linkConsumed: true,
          codeExpiresAt: codeExpiresAt.toISOString(),
        },
      },
    });

    await this.notify.sendCode(from.id, code);
    await this.audit.log({
      event: 'registration.telegram_linked',
      ip: pending.ip,
      meta: { pendingId: pending.id },
    });

    await ctx.reply(
      'Код отправлен. Вернитесь на сайт и введите его, чтобы завершить регистрацию.',
    );
  }

  async resendCode(pendingId: string): Promise<void> {
    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { id: pendingId },
    });
    if (!pending || pending.status !== PendingRegistrationStatus.PENDING) {
      throw new Error('pending_not_found');
    }

    const payload = pending.payload as PendingPayload;
    if (!payload.telegramId) {
      throw new Error('telegram_not_linked');
    }

    const code = generateSixDigitCode();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        tgCodeHash: sha256Hex(code),
        codeAttempts: 0,
        codeSentCount: { increment: 1 },
        lastCodeSentAt: new Date(),
        payload: {
          ...payload,
          codeExpiresAt: codeExpiresAt.toISOString(),
        },
      },
    });

    await this.notify.sendCode(payload.telegramId, code);
    this.logger.debug(`Resent registration code for ${pendingId}`);
  }
}
