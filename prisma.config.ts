import "dotenv/config";
import { defineConfig } from "prisma/config";

// Falls back to a harmless placeholder so `prisma generate` (run via
// postinstall, which only reads the schema — no connection needed) never
// hard-fails on a fresh clone before a real .env exists. Anything that
// actually talks to the database (migrate, studio, the app itself) needs a
// real DATABASE_URL set, and will fail loudly there instead.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres",
  },
});
