import {
  Controller,
  Headers,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Update } from 'grammy/types';
import type { FastifyRequest } from 'fastify';
import { AppConfigService } from '../config/config.service';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly config: AppConfigService,
    private readonly telegram: TelegramService,
  ) {}

  @Post('webhook')
  async webhook(
    @Req() req: FastifyRequest,
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
  ): Promise<{ ok: true }> {
    if (secret !== this.config.raw.TELEGRAM_WEBHOOK_SECRET) {
      throw new UnauthorizedException({
        ok: false,
        error: { code: 'unauthorized', message: 'Invalid webhook secret' },
      });
    }

    await this.telegram.handleUpdate(req.body as Update);
    return { ok: true };
  }
}
