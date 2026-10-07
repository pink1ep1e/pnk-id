import { NextRequest } from "next/server";
import { jsonOk } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  return jsonOk({ ok: true });
}
