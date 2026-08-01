import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

const MAX_SERIALIZATION_RETRIES = 2;

export const runSerializableTransaction = async <Result>(
  operation: (transaction: Prisma.TransactionClient) => Promise<Result>,
) => {
  for (let attempt = 0; attempt <= MAX_SERIALIZATION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < MAX_SERIALIZATION_RETRIES
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Serializable transaction retry limit reached");
};
