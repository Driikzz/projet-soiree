import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { argon2id, hash } from "argon2";
import { z } from "zod";

import { PrismaClient } from "../apps/api/src/generated/prisma/client.js";

const seedEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  ADMIN_USERNAME: z.string().trim().min(3).max(64).default("admin"),
  ADMIN_INITIAL_PASSWORD: z.string().min(12),
  SEED_DEMO_DATA: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

const seedEnvironment = seedEnvironmentSchema.parse(process.env);
const adapter = new PrismaPg({
  connectionString: seedEnvironment.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function seed() {
  const passwordHash = await hash(seedEnvironment.ADMIN_INITIAL_PASSWORD, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const admin = await prisma.admin.upsert({
    where: {
      username: seedEnvironment.ADMIN_USERNAME,
    },
    update: {
      passwordHash,
    },
    create: {
      username: seedEnvironment.ADMIN_USERNAME,
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
      adminId: admin.id,
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
