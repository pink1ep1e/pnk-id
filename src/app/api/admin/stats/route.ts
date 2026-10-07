import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const [total, blocked] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, blockedAt: { not: null } } }),
  ]);

  return jsonOk({
    total,
    active: total - blocked,
    blocked,
  });
}
