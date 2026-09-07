import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { hashToken, parseJsonArray, randomToken, toJsonArray } from "@/lib/crypto";

function jwtKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET обязателен в production");
    }
    return new TextEncoder().encode("dev-jwt-secret-change-me-please-32");
  }
  return new TextEncoder().encode(secret);
}

export async function issueAccessToken(params: {
  userId: string;
  clientId: string;
  scopes: string[];
  expiresInSec?: number;
}) {
  const exp = params.expiresInSec ?? 3600;
  return new SignJWT({
    sub: params.userId,
    aud: params.clientId,
    scope: params.scopes.join(" "),
    typ: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${exp}s`)
    .setIssuer(process.env.APP_URL || "http://localhost:3100")
    .sign(jwtKey());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, jwtKey(), {
    issuer: process.env.APP_URL || "http://localhost:3100",
  });
  return payload;
}

export async function issueRefreshToken(params: {
  userId: string;
  clientDbId: string;
  scopes: string[];
  days?: number;
}) {
  const token = randomToken(40);
  const days = params.days ?? 30;
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(token),
      userId: params.userId,
      clientId: params.clientDbId,
      scopes: toJsonArray(params.scopes),
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function rotateRefreshToken(
  rawToken: string,
  expectedClientDbId?: string,
) {
  const row = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { client: true },
  });
  if (!row || row.revokedAt || row.expiresAt < new Date()) return null;
  if (expectedClientDbId && row.clientId !== expectedClientDbId) return null;

  await prisma.refreshToken.update({
    where: { id: row.id },
    data: { revokedAt: new Date() },
  });

  const scopes = parseJsonArray(row.scopes);
  const accessToken = await issueAccessToken({
    userId: row.userId,
    clientId: row.client.clientId,
    scopes,
  });
  const refreshToken = await issueRefreshToken({
    userId: row.userId,
    clientDbId: row.clientId,
    scopes,
  });

  return {
    accessToken,
    refreshToken,
    scopes,
    clientId: row.client.clientId,
    userId: row.userId,
    expiresIn: 3600,
  };
}

export function intersectScopes(requested: string[], allowed: string[]) {
  const set = new Set(allowed);
  return requested.filter((s) => set.has(s));
}
