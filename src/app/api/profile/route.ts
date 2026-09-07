import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthFromRequest, jsonError, jsonOk } from "@/lib/auth";
import { profileSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");
  const user = await prisma.user.findUnique({ where: { id: auth.user.id } });
  if (!user) return jsonError("Пользователь не найден", 404, "not_found");
  return jsonOk({
    id: user.id,
    login: user.login,
    email: user.email,
    phone: user.phone,
    displayName: user.displayName,
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender,
    birthDate: user.birthDate,
    timezone: user.timezone,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return jsonError("Не авторизован", 401, "unauthorized");

  try {
    const body = profileSchema.parse(await req.json());
    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        displayName: body.displayName === undefined ? undefined : body.displayName,
        firstName: body.firstName === undefined ? undefined : body.firstName,
        lastName: body.lastName === undefined ? undefined : body.lastName,
        gender: body.gender === undefined ? undefined : body.gender,
        birthDate: body.birthDate === undefined ? undefined : body.birthDate,
        timezone: body.timezone === undefined ? undefined : body.timezone,
        avatarUrl: body.avatarUrl === undefined ? undefined : body.avatarUrl,
        phone: body.phone === undefined ? undefined : body.phone,
        email:
          body.email === undefined
            ? undefined
            : body.email === ""
              ? null
              : body.email,
      },
    });
    return jsonOk({
      id: user.id,
      login: user.login,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      gender: user.gender,
      birthDate: user.birthDate,
      timezone: user.timezone,
      avatarUrl: user.avatarUrl,
    });
  } catch (e) {
    if (e instanceof Error && e.name === "ZodError") {
      return jsonError("Некорректные данные профиля", 400, "validation");
    }
    console.error(e);
    return jsonError("Не удалось обновить профиль", 500, "server");
  }
}
