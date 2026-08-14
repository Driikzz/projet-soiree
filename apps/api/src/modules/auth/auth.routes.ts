import { Router } from "express";

import { userLoginRequestSchema, userRegistrationRequestSchema } from "@songfest/shared";

import { prisma } from "../../lib/prisma.js";
import { createRateLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAdmin, requireAdminCsrf, requireTrustedOrigin } from "./auth.middleware.js";
import { authenticateUser, registerUser } from "./auth.service.js";
import { clearSessionCookies, createSession } from "./session.service.js";

const loginLimiter = createRateLimiter(15 * 60 * 1_000, 10);
const registrationLimiter = createRateLimiter(60 * 60 * 1_000, 5);

export const createAuthRouter = () => {
  const router = Router();

  router.post(
    "/register",
    requireTrustedOrigin,
    registrationLimiter,
    validateBody(userRegistrationRequestSchema),
    async (request, response) => {
      const user = await registerUser(request.body);
      await createSession(response, {
        actorType: "ADMIN",
        adminId: user.id,
      });

      response.status(201).json({ user });
    },
  );

  router.post(
    "/login",
    requireTrustedOrigin,
    loginLimiter,
    validateBody(userLoginRequestSchema),
    async (request, response) => {
      const user = await authenticateUser(request.body.identifier, request.body.password);
      await createSession(response, {
        actorType: "ADMIN",
        adminId: user.id,
      });

      response.json({ user });
    },
  );

  router.get("/me", requireAdmin, (request, response) => {
    const account = request.adminAuth!.admin;
    response.json({
      user: {
        id: account.id,
        displayName: account.displayName,
        email: account.email,
      },
    });
  });

  router.post(
    "/logout",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    async (request, response) => {
      await prisma.session.update({
        where: { id: request.adminAuth!.sessionId },
        data: { revokedAt: new Date() },
      });
      clearSessionCookies(response, "ADMIN");
      response.status(204).end();
    },
  );

  return router;
};
