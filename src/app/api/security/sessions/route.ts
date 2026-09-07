import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, jsonError, jsonOk } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  const sessions = await prisma.session.findMany({
    where: { userId: auth.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
  });

  return jsonOk(
    sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      deviceType: s.deviceType,
      browser: s.browser,
      os: s.os,
      location: s.location,
      lastSeenAt: s.lastSeenAt,
      createdAt: s.createdAt,
      current: s.id === auth.sessionId,
    })),
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const allOthers = searchParams.get("others") === "1";

  if (allOthers) {
    const result = await prisma.session.updateMany({
      where: {
        userId: auth.user.id,
        id: { not: auth.sessionId },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return jsonOk({ revoked: result.count });
  }

  if (!id) return jsonError("Укажите id сессии", 400);

  const session = await prisma.session.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!session) return jsonError("Сессия не найдена", 404, "not_found");
  if (session.id === auth.sessionId) {
    return jsonError("Нельзя завершить текущую сессию так", 400, "current");
  }

  await prisma.session.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  return jsonOk({ revoked: 1 });
}
