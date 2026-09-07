import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ userId: string }> };

/** Public avatar image for OAuth `picture` URLs (and cross-service <img>). */
export async function GET(req: NextRequest, { params }: Params) {
  const { userId } = await params;
  if (!userId || userId.length > 64) {
    return new NextResponse(null, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true, updatedAt: true, deletedAt: true },
  });

  if (!user || user.deletedAt || !user.avatarUrl) {
    return new NextResponse(null, { status: 404 });
  }

  const etag = `"${user.updatedAt.getTime()}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304 });
  }

  const raw = user.avatarUrl;

  if (raw.startsWith("data:")) {
    const match = raw.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i);
    if (!match?.[2]) {
      return new NextResponse(null, { status: 404 });
    }
    const contentType = match[1] || "image/png";
    const body = Buffer.from(match[2], "base64");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(body.length),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        ETag: etag,
      },
    });
  }

  if (/^https?:\/\//i.test(raw)) {
    return NextResponse.redirect(raw, 302);
  }

  return new NextResponse(null, { status: 404 });
}
