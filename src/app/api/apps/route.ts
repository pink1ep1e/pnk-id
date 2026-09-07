import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { parseJsonArray } from "@/lib/crypto";
import { getAuthFromRequest, jsonError, jsonOk } from "@/lib/auth";

/** Connected apps (consents) */
export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  const consents = await prisma.appConsent.findMany({
    where: { userId: auth.user.id, revokedAt: null },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk(
    consents.map((c) => ({
      id: c.id,
      scopes: parseJsonArray(c.scopes),
      createdAt: c.createdAt,
      client: {
        clientId: c.client.clientId,
        name: c.client.name,
        description: c.client.description,
        logoUrl: c.client.logoUrl,
        trusted: c.client.trusted,
      },
    })),
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("id обязателен", 400);

  const consent = await prisma.appConsent.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!consent) return jsonError("Доступ не найден", 404, "not_found");

  await prisma.appConsent.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  await prisma.refreshToken.updateMany({
    where: {
      userId: auth.user.id,
      clientId: consent.clientId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  return jsonOk({ revoked: true });
}
