import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      login: true,
      email: true,
      blockedAt: true,
      createdAt: true,
      sessions: {
        where: { revokedAt: null },
        orderBy: { lastSeenAt: "desc" },
        take: 1,
        select: { lastSeenAt: true },
      },
    },
  });

  return jsonOk({
    users: users.map((u) => ({
      id: u.id,
      username: u.login,
      email: u.email || "",
      status: u.blockedAt ? ("blocked" as const) : ("active" as const),
      lastLoginAt: u.sessions[0]?.lastSeenAt?.toISOString() || u.createdAt.toISOString(),
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
