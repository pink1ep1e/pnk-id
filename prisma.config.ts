import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * DATABASE_URL is required at runtime. For `prisma generate` / Docker build
 * a placeholder is enough — real URL comes from compose/env.
 */
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://pnk:pnk@127.0.0.1:5432/pnk_id?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl,
  },
});
