import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  clearSessionCookie,
  getAuthFromRequest,
  jsonOk,
} from "@/lib/auth";

/** End ID session. Supports JSON (API) and redirect (?next=/login&service=mail). */
export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (auth) {
    await prisma.session.update({
      where: { id: auth.sessionId },
      data: { revokedAt: new Date() },
    });
  }
  const res = jsonOk({ ok: true });
  clearSessionCookie(res);
  return res;
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (auth) {
    await prisma.session.update({
      where: { id: auth.sessionId },
      data: { revokedAt: new Date() },
    });
  }

  const nextRaw = new URL(req.url).searchParams.get("next") || "/login";
  const service = new URL(req.url).searchParams.get("service");
  // Prevent open redirect: only relative paths
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/login";
  const target = new URL(next, process.env.APP_URL || req.url);
  if (service) target.searchParams.set("service", service);

  const res = NextResponse.redirect(target);
  clearSessionCookie(res);
  return res;
}
