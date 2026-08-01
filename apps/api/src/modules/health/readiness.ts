import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";

export async function checkDatabaseReadiness(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error: unknown) {
    logger.warn({ error }, "Database readiness check failed");
    return false;
  }
}
