import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/crypto";

const COOKIE = process.env.COOKIE_NAME || "pnk_id_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  login: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  gender: string | null;
  birthDate: string | null;
  timezone: string | null;
  avatarUrl: string | null;
};

export type AuthContext = {
  user: SessionUser;
  sessionId: string;
};

function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export function parseDeviceMeta(ua: string | null) {
  const raw = ua || "";
  const isPhone = /Mobile|Android|iPhone|iPad/i.test(raw);
  let browser = "Browser";
  if (/Edg\//i.test(raw)) browser = "Edge";
  else if (/Chrome\//i.test(raw)) browser = "Chrome";
  else if (/Firefox\//i.test(raw)) browser = "Firefox";
  else if (/Safari\//i.test(raw) && !/Chrome/i.test(raw)) browser = "Safari";

  let os = "Unknown";
  if (/Windows/i.test(raw)) os = "Windows";
  else if (/Mac OS|Macintosh/i.test(raw)) os = "macOS";
  else if (/Android/i.test(raw)) os = "Android";
  else if (/iPhone|iPad/i.test(raw)) os = "iOS";
  else if (/Linux/i.test(raw)) os = "Linux";

  return {
    deviceType: isPhone ? "phone" : "pc",
    deviceName: isPhone ? "Телефон" : "Это устройство",
    browser,
    os,
  };
}

export async function createSession(
  userId: string,
  req?: NextRequest,
  opts?: { deviceName?: string; location?: string },
) {
  const token = randomToken(32);
  const meta = parseDeviceMeta(req?.headers.get("user-agent") ?? null);
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      deviceName: opts?.deviceName ?? meta.deviceName,
      deviceType: meta.deviceType,
      browser: meta.browser,
      os: meta.os,
      location: opts?.location ?? "Москва",
      ip: req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: req?.headers.get("user-agent") ?? null,
      expiresAt: sessionExpiry(),
    },
  });
  return { session, token };
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getAuthFromCookies(): Promise<AuthContext | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return getAuthFromToken(token);
}

export async function getAuthFromRequest(
  req: NextRequest,
): Promise<AuthContext | null> {
  const token =
    req.cookies.get(COOKIE)?.value ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    null;
  if (!token) return null;
  return getAuthFromToken(token);
}

async function getAuthFromToken(token: string): Promise<AuthContext | null> {
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }
  if (session.user.deletedAt) return null;

  await prisma.session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  const u = session.user;
  return {
    sessionId: session.id,
    user: {
      id: u.id,
      login: u.login,
      email: u.email,
      phone: u.phone,
      displayName: u.displayName,
      firstName: u.firstName,
      lastName: u.lastName,
      gender: u.gender,
      birthDate: u.birthDate,
      timezone: u.timezone,
      avatarUrl: u.avatarUrl,
    },
  };
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { ok: false, error: { message, code: code ?? "bad_request" } },
    { status },
  );
}
