import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

async function main() {
  const mailOrigin = (
    process.env.NEXT_PUBLIC_MAIL_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  const mailSecret =
    process.env.PNK_ID_CLIENT_SECRET || "pnk-mail-dev-secret";
  const passwordHash = await bcrypt.hash(
    process.env.SEED_DEMO_PASSWORD || "password123",
    12,
  );

  const user = await prisma.user.upsert({
    where: { login: "demo" },
    update: {},
    create: {
      login: "demo",
      email: "demo@pnkmail.ru",
      phone: "+79990000000",
      passwordHash,
      displayName: "Демо",
      firstName: "Демо",
      lastName: "Пользователь",
      gender: "m",
      timezone: "(UTC+03:00) Москва",
    },
  });

  const redirectUris = [
    `${mailOrigin}/api/auth/callback/pnk-id`,
    `${mailOrigin}/oauth/callback`,
  ];

  const mail = await prisma.oAuthClient.upsert({
    where: { clientId: "pnk-mail" },
    update: {
      clientSecret: hashSecret(mailSecret),
      redirectUris: JSON.stringify(redirectUris),
      active: true,
      trusted: true,
    },
    create: {
      clientId: "pnk-mail",
      clientSecret: hashSecret(mailSecret),
      name: "pnk Mail",
      description: "Почтовый сервис pnk",
      redirectUris: JSON.stringify(redirectUris),
      scopes: JSON.stringify(["openid", "profile", "email", "phone"]),
      trusted: true,
    },
  });

  const demoSecret = "demo-service-secret";
  await prisma.oAuthClient.upsert({
    where: { clientId: "pnk-demo" },
    update: {},
    create: {
      clientId: "pnk-demo",
      clientSecret: hashSecret(demoSecret),
      name: "pnk Demo",
      description: "Пример стороннего сервиса",
      redirectUris: JSON.stringify(["http://localhost:3200/oauth/callback"]),
      scopes: JSON.stringify(["openid", "profile", "email"]),
      trusted: false,
    },
  });

  console.log("Seed OK");
  console.log("User: demo /", process.env.SEED_DEMO_PASSWORD || "password123");
  console.log("OAuth mail client:", mail.clientId);
  console.log("Redirect URIs:", redirectUris.join(", "));
  console.log("User id:", user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
