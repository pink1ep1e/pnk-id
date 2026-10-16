import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ApiError } from '../common/http/api-error';
import { hashPasswordArgon2, verifyPassword } from '../common/utils/crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { ChangePasswordDto, UpdateMeDto } from './users.dto';

function publicUser(user: {
  id: string;
  login: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  birthDate: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  telegramUsername: string | null;
  status: string;
  sandboxUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    username: user.login,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender,
    birthDate: user.birthDate,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
    telegramUsername: user.telegramUsername,
    status: user.status,
    sandboxUntil: user.sandboxUntil,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getMe(userId: string) {
    const user = await this.requireActiveUser(userId);
    return { ok: true as const, data: { user: publicUser(user) } };
  }

  async updateMe(userId: string, dto: UpdateMeDto, ip?: string) {
    await this.requireActiveUser(userId);

    if (dto.email !== undefined && dto.email !== null && dto.email !== '') {
      const taken = await this.prisma.user.findFirst({
        where: {
          email: dto.email,
          NOT: { id: userId },
        },
      });
      if (taken) {
        throw new ApiError('email_taken', 'Email is already in use');
      }
    }

    if (dto.phone !== undefined && dto.phone !== null && dto.phone !== '') {
      const taken = await this.prisma.user.findFirst({
        where: {
          phone: dto.phone,
          NOT: { id: userId },
        },
      });
      if (taken) {
        throw new ApiError('phone_taken', 'Phone is already in use');
      }
    }

    const email =
      dto.email === undefined
        ? undefined
        : dto.email === '' || dto.email === null
          ? null
          : dto.email;

    const avatarUrl =
      dto.avatarUrl === undefined
        ? undefined
        : dto.avatarUrl === '' || dto.avatarUrl === null
          ? null
          : dto.avatarUrl;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        birthDate: dto.birthDate,
        timezone: dto.timezone,
        avatarUrl,
        phone: dto.phone === '' ? null : dto.phone,
        email,
      },
    });

    await this.audit.log({
      event: 'profile.update',
      userId,
      ip,
    });

    return { ok: true as const, data: { user: publicUser(user) } };
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ip?: string) {
    const user = await this.requireActiveUser(userId);

    const ok = await verifyPassword({
      password: dto.currentPassword,
      hash: user.passwordHash,
      algo: user.passwordAlgo,
    });
    if (!ok) {
      throw new ApiError(
        'invalid_credentials',
        'Current password is incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new ApiError('same_password', 'New password must be different');
    }

    const passwordHash = await hashPasswordArgon2(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordAlgo: 'argon2id',
      },
    });

    await this.audit.log({
      event: 'password.change',
      userId,
      ip,
    });

    return { ok: true as const, data: { changed: true } };
  }

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt || user.status === 'BLOCKED') {
      throw new ApiError(
        'unauthorized',
        'User not found',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return user;
  }
}
