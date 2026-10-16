import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const optionalNullableString = (max: number) =>
  z.string().max(max).nullable().optional();

export const UpdateMeSchema = z
  .object({
    displayName: optionalNullableString(64),
    firstName: optionalNullableString(64),
    lastName: optionalNullableString(64),
    gender: z.enum(['m', 'f']).nullable().optional(),
    birthDate: optionalNullableString(32),
    timezone: optionalNullableString(80),
    avatarUrl: z.string().url().nullable().optional().or(z.literal('')),
    phone: optionalNullableString(32),
    email: z.string().email().nullable().optional().or(z.literal('')),
  })
  .strict();

export class UpdateMeDto extends createZodDto(UpdateMeSchema) {}

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
