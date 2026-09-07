import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { parseJsonArray, safeEqual } from "@/lib/crypto";
import { jsonError, jsonOk } from "@/lib/auth";
import {
  issueAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
} from "@/lib/oauth";

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

async function authenticateClient(clientId?: string, clientSecret?: string) {
  if (!clientId || !clientSecret) return null;
  const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  if (!client || !client.active) return null;
  const expected = Buffer.from(client.clientSecret);
  const actual = Buffer.from(hashSecret(clientSecret));
  if (expected.length !== actual.length) return null;
  // use timing-safe via hex strings equal length
  if (!safeEqual(client.clientSecret, hashSecret(clientSecret))) return null;
  return client;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    grant_type?: string;
    code?: string;
    redirect_uri?: string;
    client_id?: string;
    client_secret?: string;
    refresh_token?: string;
    code_verifier?: string;
  };

  const client = await authenticateClient(body.client_id, body.client_secret);
  if (!client) {
    return jsonError("Неверный client_id или client_secret", 401, "invalid_client");
  }

  if (body.grant_type === "refresh_token") {
    if (!body.refresh_token) return jsonError("refresh_token обязателен", 400);
    const rotated = await rotateRefreshToken(body.refresh_token, client.id);
    if (!rotated) return jsonError("Недействительный refresh_token", 400, "invalid_grant");
    return jsonOk({
      access_token: rotated.accessToken,
      refresh_token: rotated.refreshToken,
      token_type: "Bearer",
      expires_in: rotated.expiresIn,
      scope: rotated.scopes.join(" "),
    });
  }

  if (body.grant_type !== "authorization_code") {
    return jsonError("Неподдерживаемый grant_type", 400);
  }
  if (!body.code || !body.redirect_uri) {
    return jsonError("code и redirect_uri обязательны", 400);
  }

  const authCode = await prisma.authCode.findUnique({ where: { code: body.code } });
  if (
    !authCode ||
    authCode.usedAt ||
    authCode.expiresAt < new Date() ||
    authCode.clientId !== client.id ||
    authCode.redirectUri !== body.redirect_uri
  ) {
    return jsonError("Неверный authorization code", 400, "invalid_grant");
  }

  if (authCode.codeChallenge) {
    if (!body.code_verifier) {
      return jsonError("code_verifier обязателен (PKCE)", 400);
    }
    if (authCode.codeChallengeMethod !== "S256") {
      return jsonError("Поддерживается только PKCE S256", 400, "invalid_request");
    }
    const challenge = createHash("sha256")
      .update(body.code_verifier)
      .digest("base64url");
    if (challenge !== authCode.codeChallenge) {
      return jsonError("PKCE проверка не пройдена", 400, "invalid_grant");
    }
  }

  await prisma.authCode.update({
    where: { id: authCode.id },
    data: { usedAt: new Date() },
  });

  const scopes = parseJsonArray(authCode.scopes);
  const accessToken = await issueAccessToken({
    userId: authCode.userId,
    clientId: client.clientId,
    scopes,
  });
  const refreshToken = await issueRefreshToken({
    userId: authCode.userId,
    clientDbId: client.id,
    scopes,
  });

  return jsonOk({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: scopes.join(" "),
  });
}
