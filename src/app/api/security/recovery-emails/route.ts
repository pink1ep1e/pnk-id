import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, jsonError, jsonOk } from "@/lib/auth";

const emailSchema = z.object({
  email: z.string().email().max(128),
});

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  const rows = await prisma.recoveryEmail.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "asc" },
  });

  return jsonOk(
    rows.map((r) => ({
      id: r.id,
      email: r.email,
      verified: r.verified,
      createdAt: r.createdAt,
    })),
  );
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  try {
    const body = emailSchema.parse(await req.json());
    const email = body.email.trim().toLowerCase();

    const existing = await prisma.recoveryEmail.findFirst({
      where: { userId: auth.user.id, email },
    });
    if (existing) {
      return jsonOk({
        id: existing.id,
        email: existing.email,
        verified: existing.verified,
        createdAt: existing.createdAt,
      });
    }

    const row = await prisma.recoveryEmail.create({
      data: {
        userId: auth.user.id,
        email,
        verified: false,
      },
    });

    return jsonOk({
      id: row.id,
      email: row.email,
      verified: row.verified,
      createdAt: row.createdAt,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "ZodError") {
      return jsonError("Некорректный email", 400, "validation");
    }
    console.error(e);
    return jsonError("Не удалось сохранить", 500, "server");
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError("id обязателен", 400);

  const row = await prisma.recoveryEmail.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!row) return jsonError("Не найдено", 404, "not_found");

  await prisma.recoveryEmail.delete({ where: { id } });
  return jsonOk({ deleted: true });
}
