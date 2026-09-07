import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest } from "@/lib/auth";
import { parseJsonArray, randomToken, toJsonArray } from "@/lib/crypto";
import { resolveServiceBrand } from "@/lib/services";

/**
 * After login/register for a first-party service: issue an auth code
 * and redirect into that service (trusted clients skip consent UI).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const serviceKey = url.searchParams.get("service") || "mail";
  const brand = resolveServiceBrand(serviceKey);

  const loginUrl = new URL("/login", process.env.APP_URL || req.url);
  loginUrl.searchParams.set("service", brand.id);

  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.redirect(loginUrl);
  }

  if (!brand.oauthClientId || !brand.oauthRedirectUri) {
    return NextResponse.redirect(new URL("/cabinet", process.env.APP_URL || req.url));
  }

  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: brand.oauthClientId },
  });
  if (!client || !client.active) {
    return NextResponse.redirect(new URL("/cabinet", process.env.APP_URL || req.url));
  }

  const redirects = parseJsonArray(client.redirectUris);
  if (!redirects.includes(brand.oauthRedirectUri)) {
    return NextResponse.json(
      { ok: false, error: { message: "redirect_uri не разрешён" } },
      { status: 400 },
    );
  }

  const scopes = parseJsonArray(client.scopes);
  const allowed = scopes.length
    ? scopes
    : ["openid", "profile", "email", "phone"];

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
      redirectUri: brand.oauthRedirectUri,
      scopes: toJsonArray(allowed),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const redirect = new URL(brand.oauthRedirectUri);
  redirect.searchParams.set("code", code);
  const state = url.searchParams.get("state")?.trim();
  if (state && /^[A-Za-z0-9_-]{8,128}$/.test(state)) {
    redirect.searchParams.set("state", state);
  }
  return NextResponse.redirect(redirect);
}
