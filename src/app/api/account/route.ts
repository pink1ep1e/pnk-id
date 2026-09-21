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

/** Hard-delete account and all related rows (sessions, OAuth, support, …). */
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

    const userId = user.id;

    await prisma.$transaction(async (tx) => {
      // QrChallenge uses onDelete: SetNull — remove explicitly
      await tx.qrChallenge.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    const res = jsonOk({ deleted: true, userId });
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
