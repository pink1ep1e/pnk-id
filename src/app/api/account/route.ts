import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import {
  clearSessionCookie,
  getAuthFromRequest,
  jsonError,
  jsonOk,
} from "@/lib/auth";

const deleteSchema = z.object({
  password: z.string().min(1).max(128),
});

/** Soft-delete account (sets deletedAt, revokes sessions) */
export async function DELETE(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  try {
    const body = deleteSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
    if (!user || user.deletedAt) {
      return jsonError("Пользователь не найден", 404, "not_found");
    }

    if (!(await verifyPassword(body.password, user.passwordHash))) {
      return jsonError("Неверный пароль", 400, "bad_password");
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: now },
      }),
      prisma.session.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
      prisma.appConsent.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    const res = jsonOk({ deleted: true });
    clearSessionCookie(res);
    return res;
  } catch (e) {
    if (e instanceof Error && e.name === "ZodError") {
      return jsonError("Некорректные данные", 400, "validation");
    }
    console.error(e);
    return jsonError("Не удалось удалить аккаунт", 500, "server");
  }
}
