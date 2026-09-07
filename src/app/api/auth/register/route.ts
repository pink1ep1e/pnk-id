import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";
import { createSession, jsonError, setSessionCookie } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validators";
import { phoneDigits } from "@/lib/profile";

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phoneDigits(phone);
  if (digits.length !== 11) return null;
  return `+${digits}`;
}

export async function POST(req: NextRequest) {
  const rl = rateLimit({
    key: `register:${clientIp(req)}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return jsonError("Слишком много регистраций", 429, "rate_limited");
  }

  try {
    const body = registerSchema.parse(await req.json());
    const login = body.login.toLowerCase();
    const email = body.email.toLowerCase().trim();
    const phone = normalizePhone(body.phone);

    const byLogin = await prisma.user.findUnique({ where: { login } });
    if (byLogin) {
      return jsonError(`Логин @${login} уже занят`, 409, "login_taken");
    }

    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      return jsonError("Этот email уже используется", 409, "email_taken");
    }

    if (phone) {
      const users = await prisma.user.findMany({
        where: { phone: { not: null } },
        select: { id: true, phone: true },
      });
      const taken = users.some(
        (u) => u.phone && phoneDigits(u.phone) === phoneDigits(phone),
      );
      if (taken) {
        return jsonError("Этот номер телефона уже привязан", 409, "phone_taken");
      }
    }

    const user = await prisma.user.create({
      data: {
        login,
        passwordHash: await hashPassword(body.password),
        email,
        phone,
        firstName: body.firstName,
        lastName: body.lastName,
        displayName: body.displayName || body.firstName,
        gender: body.gender || null,
        birthDate: body.birthDate || null,
        timezone: body.timezone || "(UTC+03:00) Москва",
      },
    });

    const { session, token } = await createSession(user.id, req);
    const res = NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          login: user.login,
          email: user.email,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        sessionId: session.id,
      },
    });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Некорректные данные регистрации", 400, "validation");
    }
    console.error(e);
    return jsonError("Ошибка регистрации", 500, "server");
  }
}
