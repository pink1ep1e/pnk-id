import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { getAuthFromRequest, jsonError, jsonOk } from "@/lib/auth";
import { passwordSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  try {
    const body = passwordSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!user) return jsonError("Пользователь не найден", 404, "not_found");

    if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
      return jsonError("Неверный текущий пароль", 400, "bad_password");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.newPassword) },
    });

    // revoke other sessions
    await prisma.session.updateMany({
      where: {
        userId: user.id,
        id: { not: auth.sessionId },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return jsonOk({ updated: true });
  } catch (e) {
    if (e instanceof Error && e.name === "ZodError") {
      return jsonError("Некорректные данные", 400, "validation");
    }
    console.error(e);
    return jsonError("Не удалось сменить пароль", 500, "server");
  }
}
