import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/auth";
import { phoneDigits } from "@/lib/profile";

/** Check if login / email / phone are free. Supports batch: ?logins=a,b,c */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const loginsParam = searchParams.get("logins");
  const login = searchParams.get("login")?.toLowerCase().trim();
  const email = searchParams.get("email")?.toLowerCase().trim();
  const phoneRaw = searchParams.get("phone");

  if (loginsParam) {
    const list = [
      ...new Set(
        loginsParam
          .split(",")
          .map((s) => s.toLowerCase().trim())
          .filter((s) => s.length >= 3),
      ),
    ].slice(0, 20);

    if (!list.length) {
      return jsonOk({ results: {} as Record<string, boolean> });
    }

    const taken = await prisma.user.findMany({
      where: { login: { in: list } },
      select: { login: true },
    });
    const takenSet = new Set(taken.map((u) => u.login));
    const results: Record<string, boolean> = {};
    for (const l of list) results[l] = !takenSet.has(l);

    return jsonOk({ results });
  }

  if (!login && !email && !phoneRaw) {
    return jsonError("Укажите login, email, phone или logins", 400);
  }

  const conflicts: string[] = [];

  if (login) {
    const byLogin = await prisma.user.findUnique({ where: { login } });
    if (byLogin) conflicts.push("login");
  }

  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) conflicts.push("email");
  }

  if (phoneRaw) {
    const digits = phoneDigits(phoneRaw);
    if (digits.length === 11) {
      const users = await prisma.user.findMany({
        where: { phone: { not: null } },
        select: { phone: true },
      });
      const taken = users.some(
        (u) => u.phone && phoneDigits(u.phone) === digits,
      );
      if (taken) conflicts.push("phone");
    }
  }

  return jsonOk({
    available: conflicts.length === 0,
    conflicts,
  });
}
