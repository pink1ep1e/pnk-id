import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisterStartSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(8).max(128),
  email: z.string().email().optional(),
  turnstileToken: z.string().min(1),
  service: z.string().min(1).max(64).optional(),
  redirectUri: z.string().url().optional(),
});

export class RegisterStartDto extends createZodDto(RegisterStartSchema) {}

export const RegisterVerifySchema = z.object({
  pendingId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

export class RegisterVerifyDto extends createZodDto(RegisterVerifySchema) {}

export const RegisterResendSchema = z.object({
  pendingId: z.string().min(1),
  turnstileToken: z.string().min(1),
});

export class RegisterResendDto extends createZodDto(RegisterResendSchema) {}
