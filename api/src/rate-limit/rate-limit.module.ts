import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { RateLimitService } from './rate-limit.service';

@Module({
  imports: [TelegramModule],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
