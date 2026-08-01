import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";

const createPrismaClient = () => {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });

  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
};

declare global {
  var songfestPrisma: ReturnType<typeof createPrismaClient> | undefined;
}

export const prisma = globalThis.songfestPrisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalThis.songfestPrisma = prisma;
}
