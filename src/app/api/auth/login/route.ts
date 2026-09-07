import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { createSession, jsonError, setSessionCookie } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const rl = rateLimit({
    key: `login:${clientIp(req)}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.ok) {
    return jsonError("Слишком много попыток входа", 429, "rate_limited");
  }

  try {
    const body = loginSchema.parse(await req.json());
    const login = body.login.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ login }, { email: login }, { phone: login }],
        deletedAt: null,
      },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return jsonError("Неверный логин или пароль", 401, "invalid_credentials");
    }

    const { session, token } = await createSession(user.id, req);
    const res = NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          login: user.login,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        sessionId: session.id,
      },
    });
    setSessionCookie(res, token);
    return res;
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Некорректные данные", 400, "validation");
    }
    console.error(e);
    return jsonError("Ошибка входа", 500, "server");
  }
}
