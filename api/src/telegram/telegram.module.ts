import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramNotifyService } from './telegram-notify.service';
import { TelegramService } from './telegram.service';

@Module({
  controllers: [TelegramController],
  providers: [TelegramService, TelegramNotifyService],
  exports: [TelegramService, TelegramNotifyService],
})
export class TelegramModule {}
