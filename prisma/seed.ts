import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { argon2id, hash } from "argon2";
import { z } from "zod";

import { PrismaClient } from "../apps/api/src/generated/prisma/client.js";

const seedEnvironmentSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    INITIAL_USER_USERNAME: z.string().trim().min(3).max(64).optional(),
    INITIAL_USER_PASSWORD: z.string().min(12).optional(),
    SEED_DEMO_DATA: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .superRefine((value, context) => {
    if (
      (value.INITIAL_USER_USERNAME === undefined) !==
      (value.INITIAL_USER_PASSWORD === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["INITIAL_USER_PASSWORD"],
        message: "initial user credentials must be provided together",
      });
    }

    if (value.SEED_DEMO_DATA && value.INITIAL_USER_USERNAME === undefined) {
      context.addIssue({
        code: "custom",
        path: ["INITIAL_USER_USERNAME"],
        message: "an initial user is required for demo data",
      });
    }
  });

const seedEnvironment = seedEnvironmentSchema.parse({
  ...process.env,
  INITIAL_USER_USERNAME: process.env.INITIAL_USER_USERNAME ?? process.env.ADMIN_USERNAME,
  INITIAL_USER_PASSWORD: process.env.INITIAL_USER_PASSWORD ?? process.env.ADMIN_INITIAL_PASSWORD,
});
const adapter = new PrismaPg({
  connectionString: seedEnvironment.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function seed() {
  if (
    seedEnvironment.INITIAL_USER_USERNAME === undefined ||
    seedEnvironment.INITIAL_USER_PASSWORD === undefined
  ) {
    return;
  }

  const passwordHash = await hash(seedEnvironment.INITIAL_USER_PASSWORD, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const user = await prisma.user.upsert({
    where: {
      username: seedEnvironment.INITIAL_USER_USERNAME,
    },
    update: {
      passwordHash,
      displayName: seedEnvironment.INITIAL_USER_USERNAME,
    },
    create: {
      username: seedEnvironment.INITIAL_USER_USERNAME,
      displayName: seedEnvironment.INITIAL_USER_USERNAME,
      passwordHash,
    },
  });

  if (!seedEnvironment.SEED_DEMO_DATA) {
    return;
  }

  await prisma.party.upsert({
    where: {
      code: "DEMO26",
    },
    update: {
      name: "Soirée SongFest",
    },
    create: {
      adminId: user.id,
      name: "Soirée SongFest",
      code: "DEMO26",
      settings: {
        create: {},
      },
      playbackState: {
        create: {},
      },
      playlists: {
        create: [
          {
            name: "Apéro",
            description: "Des morceaux tranquilles pour lancer la soirée.",
            visualKey: "sunset",
          },
          {
            name: "Années 2000",
            description: "Les refrains que tout le monde connaît.",
            visualKey: "pixel",
          },
          {
            name: "Fin de soirée",
            description: "Les derniers classiques avant de rentrer.",
            visualKey: "midnight",
          },
        ],
      },
    },
  });
}

seed()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  });
