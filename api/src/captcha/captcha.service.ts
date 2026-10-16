import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class CaptchaService {
  private readonly log = new Logger(CaptchaService.name);

  constructor(private readonly config: AppConfigService) {}

  async verifyTurnstile(token: string, ip: string): Promise<boolean> {
    const response = token.trim();
    if (!response) {
      return false;
    }

    // Dev/test bypass when secret is explicitly marked
    let secret = this.config.raw.TURNSTILE_SECRET_KEY.trim();
    // Guard against quoted values pasted into .env
    if (
      (secret.startsWith('"') && secret.endsWith('"')) ||
      (secret.startsWith("'") && secret.endsWith("'"))
    ) {
      secret = secret.slice(1, -1);
    }
    if (secret.startsWith('dev-') || secret.startsWith('test-')) {
      return response.length > 0;
    }

    const form = new URLSearchParams();
    form.set('secret', secret);
    form.set('response', response);
    if (ip && ip !== 'unknown') {
      form.set('remoteip', ip);
    }

    try {
      const res = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form.toString(),
        },
      );

      const raw = await res.text();
      let data: {
        success?: boolean;
        'error-codes'?: string[];
        hostname?: string;
      } = {};
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        this.log.warn(
          `Turnstile HTTP ${res.status} non-JSON body=${raw.slice(0, 200)} tokenLen=${response.length}`,
        );
        return false;
      }

      if (!res.ok) {
        this.log.warn(
          `Turnstile HTTP ${res.status} codes=${(data['error-codes'] ?? []).join(',') || '-'} body=${raw.slice(0, 200)} tokenLen=${response.length}`,
        );
        return false;
      }

      if (!data.success) {
        this.log.warn(
          `Turnstile rejected: ${(data['error-codes'] ?? []).join(',') || 'unknown'} hostname=${data.hostname ?? '-'} tokenLen=${response.length}`,
        );
      }
      return data.success === true;
    } catch (err) {
      this.log.warn(`Turnstile verify error: ${String(err)}`);
      return false;
    }
  }
}
