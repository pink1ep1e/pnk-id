import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomToken } from "@/lib/crypto";
import {
  createSession,
  getAuthFromRequest,
  jsonError,
  jsonOk,
  setSessionCookie,
} from "@/lib/auth";

const QR_TTL_MS = 60_000;

/** Create QR challenge (desktop login screen) */
export async function POST(req: NextRequest) {
  const code = randomToken(24);
  const challenge = await prisma.qrChallenge.create({
    data: {
      code,
      expiresAt: new Date(Date.now() + QR_TTL_MS),
    },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3100";
  return jsonOk({
    id: challenge.id,
    code: challenge.code,
    expiresAt: challenge.expiresAt,
    /** Deep link / payload for QR */
    payload: `${appUrl}/qr/approve?code=${challenge.code}`,
    pollUrl: `/api/auth/qr?code=${challenge.code}`,
  });
}

/** Poll QR status (desktop) OR approve (authenticated phone) */
export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code) return jsonError("code обязателен", 400);

  const challenge = await prisma.qrChallenge.findUnique({ where: { code } });
  if (!challenge) return jsonError("QR не найден", 404, "not_found");

  if (challenge.expiresAt < new Date() && challenge.status === "pending") {
    await prisma.qrChallenge.update({
      where: { id: challenge.id },
      data: { status: "expired" },
    });
    return jsonOk({ status: "expired" });
  }

  return jsonOk({
    status: challenge.status,
    expiresAt: challenge.expiresAt,
  });
}

/** Phone confirms QR while logged in */
export async function PUT(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Войдите, чтобы подтвердить QR", 401, "unauthorized");

  const body = (await req.json()) as { code?: string; action?: string };
  if (!body.code) return jsonError("code обязателен", 400);

  const challenge = await prisma.qrChallenge.findUnique({
    where: { code: body.code },
  });
  if (!challenge) return jsonError("QR не найден", 404, "not_found");
  if (challenge.expiresAt < new Date()) {
    await prisma.qrChallenge.update({
      where: { id: challenge.id },
      data: { status: "expired" },
    });
    return jsonError("QR истёк", 410, "expired");
  }
  if (challenge.status !== "pending" && challenge.status !== "scanned") {
    return jsonError("QR уже использован", 409, "used");
  }

  if (body.action === "scan") {
    await prisma.qrChallenge.update({
      where: { id: challenge.id },
      data: { status: "scanned", userId: auth.user.id },
    });
    return jsonOk({ status: "scanned" });
  }

  // confirm → create session for the desktop side; desktop will claim via POST /claim
  await prisma.qrChallenge.update({
    where: { id: challenge.id },
    data: {
      status: "confirmed",
      userId: auth.user.id,
      confirmedAt: new Date(),
    },
  });

  return jsonOk({ status: "confirmed" });
}

/** Desktop claims session after QR confirmed */
export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as { code?: string };
  if (!body.code) return jsonError("code обязателен", 400);

  const challenge = await prisma.qrChallenge.findUnique({
    where: { code: body.code },
  });
  if (!challenge || challenge.status !== "confirmed" || !challenge.userId) {
    return jsonError("QR ещё не подтверждён", 400, "not_confirmed");
  }
  if (challenge.sessionId) {
    return jsonError("Сессия уже выдана", 409, "used");
  }

  const { session, token } = await createSession(challenge.userId, req, {
    deviceName: "Вход по QR",
  });

  await prisma.qrChallenge.update({
    where: { id: challenge.id },
    data: { sessionId: session.id },
  });

  const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
  const res = NextResponse.json({
    ok: true,
    data: {
      status: "confirmed",
      user: user
        ? {
            id: user.id,
            login: user.login,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
          }
        : null,
      sessionId: session.id,
    },
  });
  setSessionCookie(res, token);
  return res;
}
