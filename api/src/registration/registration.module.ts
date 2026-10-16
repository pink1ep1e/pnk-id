import { Module } from '@nestjs/common';
import { CaptchaModule } from '../captcha/captcha.module';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { ServicesModule } from '../services/services.module';
import { TelegramModule } from '../telegram/telegram.module';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';

@Module({
  imports: [CaptchaModule, RateLimitModule, ServicesModule, TelegramModule],
  controllers: [RegistrationController],
  providers: [RegistrationService],
})
export class RegistrationModule {}
