import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pnk = await prisma.user.findUnique({ where: { login: "pnk" } });
  if (pnk) {
    await prisma.user.update({
      where: { id: pnk.id },
      data: {
        login: `demo_${Date.now().toString(36)}`,
        email: `demo_${Date.now()}@pnkmail.ru`,
        phone: null,
      },
    });
    console.log("Freed login: pnk");
  } else {
    console.log("Login pnk already free");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
