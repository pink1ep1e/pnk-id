import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get raw(): Env {
    return {
      NODE_ENV: this.config.get('NODE_ENV', { infer: true }),
      PORT: this.config.get('PORT', { infer: true }),
      DATABASE_URL: this.config.get('DATABASE_URL', { infer: true }),
      APP_URL: this.config.get('APP_URL', { infer: true }),
      JWT_ISSUER: this.config.get('JWT_ISSUER', { infer: true }),
      COOKIE_DOMAIN: this.config.get('COOKIE_DOMAIN', { infer: true }),
      CORS_ORIGINS: this.config.get('CORS_ORIGINS', { infer: true }),
      TRUSTED_PROXIES: this.config.get('TRUSTED_PROXIES', { infer: true }),
      TURNSTILE_SECRET_KEY: this.config.get('TURNSTILE_SECRET_KEY', {
        infer: true,
      }),
      TELEGRAM_BOT_TOKEN: this.config.get('TELEGRAM_BOT_TOKEN', {
        infer: true,
      }),
      TELEGRAM_BOT_USERNAME: this.config.get('TELEGRAM_BOT_USERNAME', {
        infer: true,
      }),
      TELEGRAM_WEBHOOK_SECRET: this.config.get('TELEGRAM_WEBHOOK_SECRET', {
        infer: true,
      }),
      TELEGRAM_ADMIN_CHAT_ID: this.config.get('TELEGRAM_ADMIN_CHAT_ID', {
        infer: true,
      }),
      JWT_ACTIVE_KID: this.config.get('JWT_ACTIVE_KID', { infer: true }),
      JWT_PRIVATE_KEYS: this.config.get('JWT_PRIVATE_KEYS', { infer: true }),
      JWT_PUBLIC_KEYS: this.config.get('JWT_PUBLIC_KEYS', { infer: true }),
      RESERVED_USERNAMES: this.config.get('RESERVED_USERNAMES', {
        infer: true,
      }),
    };
  }

  get port(): number {
    return this.raw.PORT;
  }

  get isProd(): boolean {
    return this.raw.NODE_ENV === 'production';
  }

  get corsOrigins(): string[] {
    return this.raw.CORS_ORIGINS;
  }

  get trustedProxies(): string[] {
    return this.raw.TRUSTED_PROXIES;
  }
}
