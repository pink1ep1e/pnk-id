import { createHash, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { jsonError } from "@/lib/auth";

function hashToken(value: string) {
  return createHash("sha256").update(value).digest();
}

/** Bearer ADMIN_API_TOKEN — for pnk-pmp and other internal callers. */
export function requireAdmin(req: NextRequest) {
  const expected = process.env.ADMIN_API_TOKEN?.trim();
  if (!expected) {
    return {
      ok: false as const,
      response: jsonError("ADMIN_API_TOKEN not configured", 503, "not_configured"),
    };
  }

  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = new URL(req.url).searchParams.get("secret") || "";
  const got = bearer || query;

  if (!got) {
    return {
      ok: false as const,
      response: jsonError("Unauthorized", 401, "unauthorized"),
    };
  }

  const a = hashToken(got);
  const b = hashToken(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return {
      ok: false as const,
      response: jsonError("Unauthorized", 401, "unauthorized"),
    };
  }

  return { ok: true as const };
}
