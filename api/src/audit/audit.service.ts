import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    event: string;
    userId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    meta?: Prisma.InputJsonValue;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        event: params.event,
        userId: params.userId ?? undefined,
        ip: params.ip ?? undefined,
        userAgent: params.userAgent ?? undefined,
        meta: params.meta,
      },
    });
  }
}
