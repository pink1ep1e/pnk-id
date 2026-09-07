import { z } from "zod";

export const registerSchema = z.object({
  login: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/, "Логин: латиница, цифры, ._ -"),
  password: z.string().min(8).max(128),
  email: z.string().email("Некорректный email"),
  phone: z.string().max(32).nullable().optional().or(z.literal("")),
  firstName: z.string().min(1).max(64),
  lastName: z.string().min(1).max(64),
  displayName: z.string().max(64).optional(),
  gender: z.enum(["m", "f"]).nullable().optional(),
  birthDate: z.string().max(32).nullable().optional(),
  timezone: z.string().max(80).nullable().optional(),
});

export const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  displayName: z.string().max(64).nullable().optional(),
  firstName: z.string().max(64).nullable().optional(),
  lastName: z.string().max(64).nullable().optional(),
  gender: z.enum(["m", "f"]).nullable().optional(),
  birthDate: z.string().max(32).nullable().optional(),
  timezone: z.string().max(80).nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const authorizeSchema = z.object({
  response_type: z.literal("code"),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().optional(),
  state: z.string().optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(["S256", "plain"]).optional(),
});
