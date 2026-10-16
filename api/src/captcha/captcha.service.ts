import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class CaptchaService {
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
      secret: this.config.raw.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    });

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    if (!res.ok) {
      return false;
    }

    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  }
}
