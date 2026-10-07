import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400, "validation");
  }

  const status = body.status;
  if (status !== "active" && status !== "blocked") {
    return jsonError('status must be "active" or "blocked"', 400, "validation");
  }

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });
  if (!user) {
    return jsonError("User not found", 404, "not_found");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      blockedAt: status === "blocked" ? new Date() : null,
    },
    select: {
      id: true,
      login: true,
      email: true,
      blockedAt: true,
      createdAt: true,
    },
  });

  return jsonOk({
    id: updated.id,
    username: updated.login,
    email: updated.email || "",
    status: updated.blockedAt ? ("blocked" as const) : ("active" as const),
    createdAt: updated.createdAt.toISOString(),
  });
}
