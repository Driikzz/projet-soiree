import { Router } from "express";

import {
  createPartyRequestSchema,
  joinPartyRequestSchema,
  partyCodeSchema,
  uuidSchema,
} from "@songfest/shared";

import { prisma } from "../../lib/prisma.js";
import { createRateLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import {
  publishParticipantJoined,
  publishParticipantLeft,
  publishPartyResync,
} from "../../socket/realtime-publisher.js";
import {
  requireAdmin,
  requireAdminCsrf,
  requireParticipant,
  requireParticipantCsrf,
  requireTrustedOrigin,
} from "../auth/auth.middleware.js";
import { clearSessionCookies, createSession } from "../auth/session.service.js";
import { clearParticipantTrackVotes } from "../votes/track-vote.service.js";
import {
  createParty,
  getAdminParty,
  getParticipantSession,
  getPublicParty,
  joinParty,
  listPartyPeople,
  listAdminParties,
  openParty,
} from "./party.service.js";

const joinLimiter = createRateLimiter(10 * 60 * 1_000, 20);

export const createAdminPartyRouter = () => {
  const router = Router();

  router.get("/", requireAdmin, async (request, response) => {
    const parties = await listAdminParties(request.adminAuth!.admin.id);
    response.json({ parties });
  });

  router.post(
    "/",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    validateBody(createPartyRequestSchema),
    async (request, response) => {
      const party = await createParty(request.adminAuth!.admin.id, request.body);
      response.status(201).json({ party });
    },
  );

  router.get("/:partyId", requireAdmin, async (request, response) => {
    const partyId = uuidSchema.parse(request.params.partyId);
    const party = await getAdminParty(request.adminAuth!.admin.id, partyId);
    response.json({ party });
  });

  router.post(
    "/:partyId/open",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const party = await openParty(request.adminAuth!.admin.id, partyId);
      response.json({ party });
      void publishPartyResync(partyId, ["party"]);
    },
  );

  return router;
};

export const createPublicPartyRouter = () => {
  const router = Router();

  router.get("/:partyCode", async (request, response) => {
    const partyCode = partyCodeSchema.parse(request.params.partyCode);
    const party = await getPublicParty(partyCode);
    response.json({ party });
  });

  router.post(
    "/:partyCode/join",
    requireTrustedOrigin,
    joinLimiter,
    validateBody(joinPartyRequestSchema),
    async (request, response) => {
      const partyCode = partyCodeSchema.parse(request.params.partyCode);
      const session = await joinParty(partyCode, request.body);
      await createSession(response, {
        actorType: "PARTICIPANT",
        participantId: session.participant.id,
      });
      response.status(201).json(session);
      void publishParticipantJoined(session.party.id, session.participant.id);
    },
  );

  return router;
};

export const createParticipantRouter = () => {
  const router = Router();

  router.get("/me", requireParticipant, async (request, response) => {
    const session = await getParticipantSession(request.participantAuth!.participant.id);
    response.json(session);
  });

  router.get("/parties/:partyId/people", requireParticipant, async (request, response) => {
    const partyId = uuidSchema.parse(request.params.partyId);
    const people = await listPartyPeople(request.participantAuth!.participant.id, partyId);
    response.json(people);
  });

  router.post(
    "/leave",
    requireTrustedOrigin,
    requireParticipant,
    requireParticipantCsrf,
    async (request, response) => {
      const auth = request.participantAuth!;
      await prisma.$transaction(async (transaction) => {
        await transaction.session.update({
          where: { id: auth.sessionId },
          data: { revokedAt: new Date() },
        });
        await transaction.participant.update({
          where: { id: auth.participant.id },
          data: { isActive: false, lastSeenAt: new Date() },
        });
        await clearParticipantTrackVotes(transaction, auth.participant.id);
      });
      clearSessionCookies(response, "PARTICIPANT");
      response.status(204).end();
      void publishParticipantLeft(auth.participant.partyId, auth.participant.id);
    },
  );

  return router;
};
