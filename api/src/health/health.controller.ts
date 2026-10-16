import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health(): Promise<{ ok: true; data: { status: string; db: string } }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, data: { status: 'ok', db: 'up' } };
    } catch {
      throw new ServiceUnavailableException({
        ok: false,
        error: { code: 'db_unavailable', message: 'Database unavailable' },
      });
    }
  }
}
