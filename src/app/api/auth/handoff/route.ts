import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/auth";
import { hashToken, randomToken, safeEqual } from "@/lib/crypto";
import { verifyAccessToken } from "@/lib/oauth";
import { CABINET_HANDOFF_URI } from "@/lib/handoff";

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

async function authenticateClient(clientId?: string, clientSecret?: string) {
  if (!clientId || !clientSecret) return null;
  const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  if (!client || !client.active) return null;
  if (!safeEqual(client.clientSecret, hashSecret(clientSecret))) return null;
  return client;
}

/**
 * First-party clients (mail) mint a one-time code that /api/auth/resume
 * turns into a browser ID session — for the user behind the given tokens.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    client_id?: string;
    client_secret?: string;
    refresh_token?: string;
    access_token?: string;
  };

  const client = await authenticateClient(body.client_id, body.client_secret);
  if (!client) {
    return jsonError("Неверный client_id или client_secret", 401, "invalid_client");
  }

  let userId: string | null = null;

  if (body.refresh_token?.trim()) {
    const row = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(body.refresh_token.trim()) },
    });
    if (
      row &&
      !row.revokedAt &&
      row.expiresAt > new Date() &&
      row.clientId === client.id
    ) {
      userId = row.userId;
    }
  }

  if (!userId && body.access_token?.trim()) {
    try {
      const payload = await verifyAccessToken(body.access_token.trim());
      if (payload.typ === "access" && payload.sub) {
        const aud = String(payload.aud || "");
        if (!aud || aud === client.clientId) {
          userId = String(payload.sub);
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (!userId) {
    return jsonError("Недействительный токен", 401, "invalid_token");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    return jsonError("Пользователь не найден", 404, "not_found");
  }

  const code = randomToken(32);
  await prisma.authCode.create({
    data: {
      code,
      userId: user.id,
      clientId: client.id,
      redirectUri: CABINET_HANDOFF_URI,
      scopes: "[]",
      expiresAt: new Date(Date.now() + 60 * 1000),
    },
  });

  return jsonOk({ code, expires_in: 60 });
}
