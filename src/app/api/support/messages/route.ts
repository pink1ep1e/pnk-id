import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, jsonError, jsonOk } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  const messages = await prisma.supportMessage.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  if (messages.length === 0) {
    const seeded = await prisma.supportMessage.createMany({
      data: [
        {
          userId: auth.user.id,
          fromRole: "support",
          text: "Здравствуйте! Вы написали в поддержку pnk ID. Чем можем помочь?",
        },
      ],
    });
    void seeded;
    const again = await prisma.supportMessage.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "asc" },
    });
    return jsonOk(again);
  }

  return jsonOk(messages);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  const body = (await req.json()) as { text?: string };
  const text = body.text?.trim();
  if (!text) return jsonError("Пустое сообщение", 400);

  const msg = await prisma.supportMessage.create({
    data: {
      userId: auth.user.id,
      fromRole: "user",
      text,
    },
  });

  // auto-reply stub
  await prisma.supportMessage.create({
    data: {
      userId: auth.user.id,
      fromRole: "support",
      text: "Приняли обращение. Ответим в этом чате, обычно в течение нескольких минут.",
    },
  });

  return jsonOk(msg);
}
