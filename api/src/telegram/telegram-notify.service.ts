import { Injectable, Logger } from '@nestjs/common';
import { Bot } from 'grammy';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class TelegramNotifyService {
  private readonly logger = new Logger(TelegramNotifyService.name);
  private bot: Bot | null = null;

  constructor(private readonly config: AppConfigService) {}

  private getBot(): Bot {
    if (!this.bot) {
      this.bot = new Bot(this.config.raw.TELEGRAM_BOT_TOKEN);
    }
    return this.bot;
  }

  async sendCode(chatId: number | string, code: string): Promise<void> {
    await this.getBot().api.sendMessage(
      chatId,
      `Код подтверждения pnk ID: ${code}\nДействует 10 минут.`,
    );
  }

  async alertAdmin(text: string): Promise<void> {
    try {
      await this.getBot().api.sendMessage(
        this.config.raw.TELEGRAM_ADMIN_CHAT_ID,
        text,
      );
    } catch (err) {
      this.logger.warn(`Failed to alert admin: ${String(err)}`);
    }
  }
}
