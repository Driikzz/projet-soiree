import { verify } from "argon2";

import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";

export const authenticateAdmin = async (username: string, password: string) => {
  const admin = await prisma.admin.findUnique({
    where: { username },
    select: { id: true, username: true, passwordHash: true },
  });

  const passwordIsValid =
    admin === null ? false : await verify(admin.passwordHash, password).catch(() => false);

  if (admin === null || !passwordIsValid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Identifiant ou mot de passe incorrect.");
  }

  return {
    id: admin.id,
    username: admin.username,
  };
};
