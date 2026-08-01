import { Router } from "express";

import { uuidSchema } from "@songfest/shared";

import { createRateLimiter } from "../../middleware/rate-limit.js";
import {
  requireAdmin,
  requireAdminCsrf,
  requireParticipant,
  requireTrustedOrigin,
} from "../auth/auth.middleware.js";
import { publishPartyResync } from "../../socket/realtime-publisher.js";
import {
  getAdminPlayback,
  getParticipantPlayback,
  pausePartyPlayback,
  resumePartyPlayback,
  skipPartyPlayback,
  startPartyPlayback,
} from "./playback.service.js";

const playbackControlLimiter = createRateLimiter(60 * 1_000, 30);

export const createPlaybackRouter = () => {
  const router = Router();

  router.get("/parties/:partyId/playback", requireParticipant, async (request, response) => {
    const partyId = uuidSchema.parse(request.params.partyId);
    const playback = await getParticipantPlayback(request.participantAuth!.participant.id, partyId);
    response.json(playback);
  });

  router.get("/admin/parties/:partyId/playback", requireAdmin, async (request, response) => {
    const partyId = uuidSchema.parse(request.params.partyId);
    const playback = await getAdminPlayback(request.adminAuth!.admin.id, partyId);
    response.json(playback);
  });

  const controls = [
    ["start", startPartyPlayback],
    ["pause", pausePartyPlayback],
    ["resume", resumePartyPlayback],
    ["skip", skipPartyPlayback],
  ] as const;

  for (const [action, control] of controls) {
    router.post(
      `/admin/parties/:partyId/playback/${action}`,
      requireTrustedOrigin,
      requireAdmin,
      requireAdminCsrf,
      playbackControlLimiter,
      async (request, response) => {
        const partyId = uuidSchema.parse(request.params.partyId);
        const playback = await control(request.adminAuth!.admin.id, partyId);
        response.json(playback);
        void publishPartyResync(partyId, ["party", "playlists", "tracks", "playback"]);
      },
    );
  }

  return router;
};
