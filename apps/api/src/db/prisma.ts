import { env } from "../config/env.js";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  datasourceUrl: env.DATABASE_URL,
  log:
    env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"]
});
