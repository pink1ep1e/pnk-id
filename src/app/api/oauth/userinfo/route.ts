import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/auth";
import { verifyAccessToken } from "@/lib/oauth";

export async function GET(req: NextRequest) {
  const header = req.headers.get("authorization");
  const token = header?.replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("Bearer token обязателен", 401, "unauthorized");

  try {
    const payload = await verifyAccessToken(token);
    const userId = String(payload.sub);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      return jsonError("Пользователь не найден", 404, "not_found");
    }

    const scope = String(payload.scope || "");
    const appUrl = (process.env.APP_URL || "http://localhost:3100").replace(
      /\/$/,
      "",
    );
    const picture = user.avatarUrl
      ? `${appUrl}/api/public/avatar/${user.id}?v=${user.updatedAt.getTime()}`
      : null;
    const data: Record<string, unknown> = {
      sub: user.id,
      // Always expose picture when present — mail needs it even if scope is odd
      ...(picture ? { picture } : {}),
    };
    if (scope.includes("profile")) {
      data.name = user.displayName;
      data.given_name = user.firstName;
      data.family_name = user.lastName;
      data.preferred_username = user.login;
      data.locale = "ru";
      data.zoneinfo = user.timezone;
    }
    if (scope.includes("email")) {
      data.email = user.email;
      data.email_verified = Boolean(user.email);
    }
    if (scope.includes("phone")) {
      data.phone_number = user.phone;
      data.phone_number_verified = Boolean(user.phone);
    }

    return jsonOk(data);
  } catch {
    return jsonError("Недействительный access_token", 401, "invalid_token");
  }
}
