import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { randomToken, parseJsonArray, toJsonArray } from "@/lib/crypto";
import { getAuthFromRequest, jsonError, jsonOk } from "@/lib/auth";
import { intersectScopes } from "@/lib/oauth";

/**
 * User consents to an OAuth client and receives authorization code.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Войдите в pnk ID", 401, "unauthorized");

  const body = (await req.json()) as {
    client_id?: string;
    redirect_uri?: string;
    scope?: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: "S256" | "plain";
    approve?: boolean;
  };

  if (!body.client_id || !body.redirect_uri) {
    return jsonError("client_id и redirect_uri обязательны", 400);
  }

  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: body.client_id },
  });
  if (!client || !client.active) {
    return jsonError("Неизвестное приложение", 400, "invalid_client");
  }

  const redirects = parseJsonArray(client.redirectUris);
  if (!redirects.includes(body.redirect_uri)) {
    return jsonError("redirect_uri не разрешён", 400, "invalid_redirect");
  }

  const requested = (body.scope || "openid profile email")
    .split(/\s+/)
    .filter(Boolean);
  const allowed = intersectScopes(requested, parseJsonArray(client.scopes));
  if (!allowed.length) {
    return jsonError("Нет доступных scope", 400, "invalid_scope");
  }

  if (body.approve === false) {
    const url = new URL(body.redirect_uri);
    url.searchParams.set("error", "access_denied");
    if (body.state) url.searchParams.set("state", body.state);
    return jsonOk({ redirect: url.toString() });
  }

  await prisma.appConsent.upsert({
    where: {
      userId_clientId: { userId: auth.user.id, clientId: client.id },
    },
    create: {
      userId: auth.user.id,
      clientId: client.id,
      scopes: toJsonArray(allowed),
    },
    update: {
      scopes: toJsonArray(allowed),
      revokedAt: null,
    },
  });

  const code = randomToken(32);
  await prisma.authCode.create({
    data: {
      code,
      userId: auth.user.id,
      clientId: client.id,
      redirectUri: body.redirect_uri,
      scopes: toJsonArray(allowed),
      codeChallenge: body.code_challenge || null,
      codeChallengeMethod: body.code_challenge_method || null,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const url = new URL(body.redirect_uri);
  url.searchParams.set("code", code);
  if (body.state) url.searchParams.set("state", body.state);

  return jsonOk({
    code,
    redirect: url.toString(),
    client: {
      name: client.name,
      clientId: client.clientId,
      description: client.description,
    },
    scopes: allowed,
  });
}

/** Public client metadata */
export async function GET(req: NextRequest) {
  const clientId = new URL(req.url).searchParams.get("client_id");
  if (!clientId) return jsonError("client_id обязателен", 400);
  const client = await prisma.oAuthClient.findUnique({
    where: { clientId },
  });
  if (!client || !client.active) {
    return jsonError("Клиент не найден", 404, "not_found");
  }
  return jsonOk({
    clientId: client.clientId,
    name: client.name,
    description: client.description,
    logoUrl: client.logoUrl,
    scopes: parseJsonArray(client.scopes),
    trusted: client.trusted,
  });
}
