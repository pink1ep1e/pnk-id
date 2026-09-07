import { NextRequest } from "next/server";
import { getAuthFromRequest, jsonError, jsonOk } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  // Session age from DB (password login time ≈ createdAt)
  const { prisma } = await import("@/lib/db");
  const session = await prisma.session.findUnique({
    where: { id: auth.sessionId },
    select: { createdAt: true, lastSeenAt: true, expiresAt: true },
  });
  const authenticatedAt = session?.createdAt?.toISOString() ?? null;
  const ageMs = session
    ? Date.now() - session.createdAt.getTime()
    : Number.POSITIVE_INFINITY;
  const needsReauth = ageMs > 30 * 24 * 60 * 60 * 1000;

  return jsonOk({
    user: auth.user,
    sessionId: auth.sessionId,
    authenticatedAt,
    needsReauth,
  });
}
