import { Injectable } from '@nestjs/common';
import { RegistrationAttemptResult } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ipToSubnet } from '../common/utils/get-client-ip';
import { TelegramNotifyService } from '../telegram/telegram-notify.service';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

@Injectable()
export class RateLimitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: TelegramNotifyService,
  ) {}

  subnetOf(ip: string): string {
    return ipToSubnet(ip);
  }

  async recordAttempt(params: {
    ip: string;
    result: RegistrationAttemptResult;
    username?: string;
  }): Promise<void> {
    await this.prisma.registrationAttempt.create({
      data: {
        ip: params.ip,
        subnet: this.subnetOf(params.ip),
        result: params.result,
        username: params.username,
      },
    });

    if (
      params.result === RegistrationAttemptResult.START_REJECTED ||
      params.result === RegistrationAttemptResult.VERIFY_FAIL
    ) {
      await this.maybeAlertAdmin(params.ip);
    }
  }

  async assertCanStart(
    ip: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const now = Date.now();
    const hourAgo = new Date(now - HOUR_MS);
    const dayAgo = new Date(now - DAY_MS);
    const weekAgo = new Date(now - WEEK_MS);
    const subnet = this.subnetOf(ip);

    const [startsHour, successDay, successWeek, subnetDay] = await Promise.all([
      this.prisma.registrationAttempt.count({
        where: {
          ip,
          createdAt: { gte: hourAgo },
          result: {
            in: [
              RegistrationAttemptResult.START_OK,
              RegistrationAttemptResult.START_REJECTED,
            ],
          },
        },
      }),
      this.prisma.registrationAttempt.count({
        where: {
          ip,
          createdAt: { gte: dayAgo },
          result: RegistrationAttemptResult.VERIFY_OK,
        },
      }),
      this.prisma.registrationAttempt.count({
        where: {
          ip,
          createdAt: { gte: weekAgo },
          result: RegistrationAttemptResult.VERIFY_OK,
        },
      }),
      this.prisma.registrationAttempt.count({
        where: {
          subnet,
          createdAt: { gte: dayAgo },
          result: RegistrationAttemptResult.VERIFY_OK,
        },
      }),
    ]);

    if (startsHour >= 10) {
      return { ok: false, reason: 'too_many_attempts' };
    }
    if (successDay >= 2) {
      return { ok: false, reason: 'daily_limit' };
    }
    if (successWeek >= 5) {
      return { ok: false, reason: 'weekly_limit' };
    }
    if (subnetDay >= 5) {
      return { ok: false, reason: 'subnet_limit' };
    }
    return { ok: true };
  }

  private async maybeAlertAdmin(ip: string): Promise<void> {
    const hourAgo = new Date(Date.now() - HOUR_MS);
    const fails = await this.prisma.registrationAttempt.count({
      where: {
        ip,
        createdAt: { gte: hourAgo },
        result: {
          in: [
            RegistrationAttemptResult.START_REJECTED,
            RegistrationAttemptResult.VERIFY_FAIL,
          ],
        },
      },
    });
    if (fails >= 5) {
      await this.notify.alertAdmin(
        `pnk-id: ${fails} failed registration attempts from ${ip} in the last hour`,
      );
    }
  }
}
