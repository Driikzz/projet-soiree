import { Router } from "express";

import { adminLoginRequestSchema } from "@songfest/shared";

import { prisma } from "../../lib/prisma.js";
import { createRateLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAdmin, requireAdminCsrf, requireTrustedOrigin } from "./auth.middleware.js";
import { authenticateAdmin } from "./auth.service.js";
import { clearSessionCookies, createSession } from "./session.service.js";

const loginLimiter = createRateLimiter(15 * 60 * 1_000, 10);

export const createAuthRouter = () => {
  const router = Router();

  router.post(
    "/login",
    requireTrustedOrigin,
    loginLimiter,
    validateBody(adminLoginRequestSchema),
    async (request, response) => {
      const admin = await authenticateAdmin(request.body.username, request.body.password);
      await createSession(response, {
        actorType: "ADMIN",
        adminId: admin.id,
      });

      response.json({ admin });
    },
  );

  router.get("/me", requireAdmin, (request, response) => {
    response.json({ admin: request.adminAuth?.admin });
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
