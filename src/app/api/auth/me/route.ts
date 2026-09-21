import { NextRequest, NextResponse } from "next/server";
import {
  getAuthFromRequest,
  jsonError,
  jsonOk,
  setSessionCookie,
} from "@/lib/auth";

const COOKIE = process.env.COOKIE_NAME || "pnk_id_session";
const SESSION_DAYS = 30;

/**
 * Current browser session. If this returns ok, password is NOT required —
 * session is valid and sliding (extended on each use for SESSION_DAYS).
 */
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  const { prisma } = await import("@/lib/db");
  const session = await prisma.session.findUnique({
    where: { id: auth.sessionId },
    select: { createdAt: true, lastSeenAt: true, expiresAt: true },
  });

  const lastSeenAt = session?.lastSeenAt?.toISOString() ?? null;
  const authenticatedAt = lastSeenAt ?? session?.createdAt?.toISOString() ?? null;

  // Valid cookie session ⇒ no reauth. Kick happens in getAuthFromToken after idle month.
  const needsReauth = false;

  const res = jsonOk({
    user: auth.user,
    sessionId: auth.sessionId,
    authenticatedAt,
    lastSeenAt,
    expiresAt: session?.expiresAt?.toISOString() ?? null,
    needsReauth,
    sessionDays: SESSION_DAYS,
  });

  // Refresh cookie maxAge so browser keeps it for another month of use
  const token = req.cookies.get(COOKIE)?.value;
  if (token) {
    setSessionCookie(res as NextResponse, token);
  }

  return res;
}
