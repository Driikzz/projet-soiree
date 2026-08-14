import { Router } from "express";

import { submitFlashTrackRequestSchema, uuidSchema } from "@songfest/shared";

import { createRateLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import {
  requireAdmin,
  requireAdminCsrf,
  requireParticipant,
  requireParticipantCsrf,
  requireTrustedOrigin,
} from "../auth/auth.middleware.js";
import {
  cancelFlashTurn,
  getParticipantFlashState,
  submitParticipantFlashTrack,
  triggerFlashTurn,
} from "./flash.service.js";

const flashSubmissionLimiter = createRateLimiter(60 * 1_000, 10);
const flashAdminLimiter = createRateLimiter(60 * 1_000, 20);

export const createFlashRouter = () => {
  const router = Router();

  router.get("/parties/:partyId/flash", requireParticipant, async (request, response) => {
    const partyId = uuidSchema.parse(request.params.partyId);
    const flash = await getParticipantFlashState(request.participantAuth!.participant.id, partyId);
    response.json({ flash });
  });

  router.post(
    "/parties/:partyId/flash/submit",
    requireTrustedOrigin,
    requireParticipant,
    requireParticipantCsrf,
    flashSubmissionLimiter,
    validateBody(submitFlashTrackRequestSchema),
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const result = await submitParticipantFlashTrack(
        request.participantAuth!.participant.id,
        partyId,
        request.body,
      );
      response.status(201).json(result);
    },
  );

  router.post(
    "/organizer/parties/:partyId/flash/trigger",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    flashAdminLimiter,
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const flash = await triggerFlashTurn(request.adminAuth!.admin.id, partyId);
      response.json({ flash });
    },
  );

  router.post(
    "/organizer/parties/:partyId/flash/cancel",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    flashAdminLimiter,
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const flash = await cancelFlashTurn(request.adminAuth!.admin.id, partyId);
      response.json({ flash });
    },
  );

  return router;
};
