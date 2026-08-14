import { Router } from "express";

import {
  assignRewardRequestSchema,
  removeTrackRequestSchema,
  updatePartySettingsRequestSchema,
  useRewardRequestSchema,
  uuidSchema,
} from "@songfest/shared";

import { createRateLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import {
  disconnectPartyParticipantSockets,
  disconnectParticipantSockets,
  publishPartyEnded,
  publishPartyResync,
  publishPartySettingsUpdated,
  publishRewardAssigned,
  publishRewardUsed,
  publishTrackRemoved,
} from "../../socket/realtime-publisher.js";
import {
  requireAdmin,
  requireAdminCsrf,
  requireParticipant,
  requireParticipantCsrf,
  requireTrustedOrigin,
} from "../auth/auth.middleware.js";
import { assignReward, listParticipantRewards, useReward } from "../rewards/reward.service.js";
import {
  blockParticipant,
  endParty,
  forceTrack,
  getAdminDashboard,
  removeTrack,
  updatePartySettings,
} from "./admin.service.js";

const adminActionLimiter = createRateLimiter(60 * 1_000, 60);
const rewardUseLimiter = createRateLimiter(60 * 1_000, 20);

export const createAdminDashboardRouter = () => {
  const router = Router();

  router.get("/organizer/parties/:partyId/dashboard", requireAdmin, async (request, response) => {
    const partyId = uuidSchema.parse(request.params.partyId);
    const dashboard = await getAdminDashboard(request.adminAuth!.admin.id, partyId);
    response.json(dashboard);
  });

  router.patch(
    "/organizer/parties/:partyId/settings",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    adminActionLimiter,
    validateBody(updatePartySettingsRequestSchema),
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const settings = await updatePartySettings(
        request.adminAuth!.admin.id,
        partyId,
        request.body,
      );
      response.json({ settings });
      void publishPartySettingsUpdated(partyId, settings);
    },
  );

  router.post(
    "/organizer/parties/:partyId/participants/:participantId/block",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    adminActionLimiter,
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const participantId = uuidSchema.parse(request.params.participantId);
      const participant = await blockParticipant(
        request.adminAuth!.admin.id,
        partyId,
        participantId,
      );
      response.json({ participant });
      disconnectParticipantSockets(participantId);
      void publishPartyResync(partyId, ["party", "participants"]);
    },
  );

  router.post(
    "/organizer/rewards",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    adminActionLimiter,
    validateBody(assignRewardRequestSchema),
    async (request, response) => {
      const reward = await assignReward(request.adminAuth!.admin.id, request.body);
      response.status(201).json({ reward });
      void publishRewardAssigned(reward);
    },
  );

  router.delete(
    "/organizer/parties/:partyId/tracks/:trackId",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    adminActionLimiter,
    validateBody(removeTrackRequestSchema),
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const trackId = uuidSchema.parse(request.params.trackId);
      await removeTrack(request.adminAuth!.admin.id, partyId, trackId, request.body);
      response.status(204).end();
      void publishTrackRemoved(trackId);
    },
  );

  router.post(
    "/organizer/parties/:partyId/tracks/:trackId/force",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    adminActionLimiter,
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const trackId = uuidSchema.parse(request.params.trackId);
      const track = await forceTrack(request.adminAuth!.admin.id, partyId, trackId);
      response.json({ track });
      void publishPartyResync(partyId, ["tracks"]);
    },
  );

  router.post(
    "/organizer/parties/:partyId/end",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    adminActionLimiter,
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const party = await endParty(request.adminAuth!.admin.id, partyId);
      response.json({ party: { id: party.id, endedAt: party.endedAt.toISOString() } });
      void publishPartyEnded(partyId, party.endedAt).finally(() => {
        disconnectPartyParticipantSockets(partyId);
      });
    },
  );

  router.get("/participant/rewards", requireParticipant, async (request, response) => {
    const rewards = await listParticipantRewards(request.participantAuth!.participant.id);
    response.json({ rewards });
  });

  router.post(
    "/participant/rewards/use",
    requireTrustedOrigin,
    requireParticipant,
    requireParticipantCsrf,
    rewardUseLimiter,
    validateBody(useRewardRequestSchema),
    async (request, response) => {
      const result = await useReward(request.participantAuth!.participant.id, request.body);
      response.json(result);
      void publishRewardUsed(result.partyId, result.rewardId);
      void publishPartyResync(result.partyId, ["party", "playlists", "tracks", "rewards"]);
    },
  );

  return router;
};
