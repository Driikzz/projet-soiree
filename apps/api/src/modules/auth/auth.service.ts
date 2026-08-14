import { argon2id, hash, verify } from "argon2";

import { AppError } from "../../errors/app-error.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

const normalizeEmail = (email: string) => email.trim().toLocaleLowerCase("fr-FR");

const toAuthenticatedUser = (user: { id: string; displayName: string; email: string | null }) => ({
  id: user.id,
  displayName: user.displayName,
  email: user.email,
});

export const registerUser = async (input: {
  displayName: string;
  email: string;
  password: string;
}) => {
  const passwordHash = await hash(input.password, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  try {
    const user = await prisma.user.create({
      data: {
        displayName: input.displayName.trim(),
        email: normalizeEmail(input.email),
        passwordHash,
      },
      select: { id: true, displayName: true, email: true },
    });

    return toAuthenticatedUser(user);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "ACCOUNT_ALREADY_EXISTS", "Un compte utilise déjà cet e-mail.");
    }

    throw error;
  }
};

export const authenticateUser = async (identifier: string, password: string) => {
  const normalizedIdentifier = normalizeEmail(identifier);
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedIdentifier }, { username: identifier.trim() }],
    },
    select: { id: true, displayName: true, email: true, passwordHash: true },
  });

  const passwordIsValid =
    user === null ? false : await verify(user.passwordHash, password).catch(() => false);

  if (user === null || !passwordIsValid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Identifiant ou mot de passe incorrect.");
  }

  return toAuthenticatedUser(user);
};
