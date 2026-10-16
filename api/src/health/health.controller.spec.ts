import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  it('returns ok when db responds', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const controller = new HealthController(prisma);
    await expect(controller.health()).resolves.toEqual({
      ok: true,
      data: { status: 'ok', db: 'up' },
    });
  });

  it('throws when db is down', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('down')),
    } as unknown as PrismaService;
    const controller = new HealthController(prisma);
    await expect(controller.health()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
