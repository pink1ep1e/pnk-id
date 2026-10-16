import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
  service: z.string().min(1).max(64).optional(),
  redirectUri: z.string().url().optional(),
});

export class LoginDto extends createZodDto(LoginSchema) {}
