import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  jsonError,
  setSessionCookie,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CABINET_HANDOFF_URI } from "@/lib/handoff";

const APP_URL = (process.env.APP_URL || "http://localhost:3100").replace(
  /\/$/,
  "",
);

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/cabinet";
  return raw;
}

async function sessionRedirect(req: NextRequest, userId: string, next: string) {
  const { token } = await createSession(userId, req);
  const res = NextResponse.redirect(new URL(next, APP_URL), 303);
  setSessionCookie(res, token);
  return res;
}

/**
 * GET ?code= — one-time handoff from first-party clients (mail manage account).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code")?.trim();
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login", APP_URL));
  }

  const row = await prisma.authCode.findUnique({ where: { code } });
  if (
    !row ||
    row.usedAt ||
    row.expiresAt < new Date() ||
    row.redirectUri !== CABINET_HANDOFF_URI
  ) {
    return NextResponse.redirect(
      new URL("/login?error=handoff", APP_URL),
    );
  }

  await prisma.authCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  return sessionRedirect(req, row.userId, next);
}

/**
 * POST access_token — disabled in production (use GET ?code= handoff only).
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return jsonError(
      "Используйте handoff-код (GET ?code=)",
      403,
      "handoff_required",
    );
  }

  const { verifyAccessToken } = await import("@/lib/oauth");
  const ct = req.headers.get("content-type") || "";
  let accessToken = "";
  let next = "/cabinet";

  if (ct.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as {
      access_token?: string;
      next?: string;
    };
    accessToken = body.access_token?.trim() || "";
    next = safeNext(body.next ?? null);
  } else {
    const form = await req.formData().catch(() => null);
    accessToken = String(form?.get("access_token") || "").trim();
    next = safeNext(String(form?.get("next") || "/cabinet"));
  }

  if (!accessToken) {
    return jsonError("access_token обязателен", 400, "missing_token");
  }

  try {
    const payload = await verifyAccessToken(accessToken);
    if (payload.typ && payload.typ !== "access") {
      return jsonError("Недействительный access_token", 401, "invalid_token");
    }
    const userId = String(payload.sub || "");
    if (!userId) {
      return jsonError("Недействительный access_token", 401, "invalid_token");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      return jsonError("Пользователь не найден", 404, "not_found");
    }

    return sessionRedirect(req, user.id, next);
  } catch {
    return jsonError("Недействительный access_token", 401, "invalid_token");
  }
}
