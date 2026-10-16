import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class CaptchaService {
  private readonly log = new Logger(CaptchaService.name);

  constructor(private readonly config: AppConfigService) {}

  async verifyTurnstile(token: string, ip: string): Promise<boolean> {
    if (!token.trim()) {
      return false;
    }

    // Dev/test bypass when secret is explicitly marked
    const secret = this.config.raw.TURNSTILE_SECRET_KEY;
    if (secret.startsWith('dev-') || secret.startsWith('test-')) {
      return token.length > 0;
    }

    const body = new URLSearchParams({
      secret,
      response: token,
    });
    if (ip && ip !== 'unknown') {
      body.set('remoteip', ip);
    }

    try {
      const res = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
        },
      );

      if (!res.ok) {
        this.log.warn(`Turnstile HTTP ${res.status}`);
        return false;
      }

      const data = (await res.json()) as {
        success?: boolean;
        'error-codes'?: string[];
        hostname?: string;
      };
      if (!data.success) {
        this.log.warn(
          `Turnstile rejected: ${(data['error-codes'] ?? []).join(',') || 'unknown'} hostname=${data.hostname ?? '-'}`,
        );
      }
      return data.success === true;
    } catch (err) {
      this.log.warn(`Turnstile verify error: ${String(err)}`);
      return false;
    }
  }
}
