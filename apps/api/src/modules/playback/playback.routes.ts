import { Router } from "express";

import { startPlaybackRequestSchema, uuidSchema } from "@songfest/shared";

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
  publishPartyResync,
  publishPlaybackSkipVoteUpdated,
} from "../../socket/realtime-publisher.js";
import { addPlaybackSkipVote, removePlaybackSkipVote } from "./playback-skip-vote.service.js";
import {
  getAdminPlayback,
  getParticipantPlayback,
  pausePartyPlayback,
  resumePartyPlayback,
  skipPartyPlayback,
  startPartyPlayback,
} from "./playback.service.js";

const playbackControlLimiter = createRateLimiter(60 * 1_000, 30);
const playbackSkipVoteLimiter = createRateLimiter(60 * 1_000, 20);

export const createPlaybackRouter = () => {
  const router = Router();

  router.get("/parties/:partyId/playback", requireParticipant, async (request, response) => {
    const partyId = uuidSchema.parse(request.params.partyId);
    const playback = await getParticipantPlayback(request.participantAuth!.participant.id, partyId);
    response.json(playback);
  });

  router.get("/organizer/parties/:partyId/playback", requireAdmin, async (request, response) => {
    const partyId = uuidSchema.parse(request.params.partyId);
    const playback = await getAdminPlayback(request.adminAuth!.admin.id, partyId);
    response.json(playback);
  });

  const skipVoteActions = [
    ["post", addPlaybackSkipVote],
    ["delete", removePlaybackSkipVote],
  ] as const;
  for (const [method, action] of skipVoteActions) {
    router[method](
      "/parties/:partyId/playback/skip-vote",
      requireTrustedOrigin,
      requireParticipant,
      requireParticipantCsrf,
      playbackSkipVoteLimiter,
      async (request, response) => {
        const partyId = uuidSchema.parse(request.params.partyId);
        const result = await action(request.participantAuth!.participant.id, partyId);
        response.json(result.playback);
        void publishPlaybackSkipVoteUpdated(partyId, {
          trackId: result.updatedTrackId,
          voteCount: result.playback.skipVote.voteCount,
          requiredVotes: result.playback.skipVote.requiredVotes,
        });
      },
    );
  }

  router.post(
    "/organizer/parties/:partyId/playback/start",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    playbackControlLimiter,
    validateBody(startPlaybackRequestSchema),
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const playback = await startPartyPlayback(request.adminAuth!.admin.id, partyId, request.body);
      response.json(playback);
      void publishPartyResync(partyId, ["party", "playlists", "tracks", "playback"]);
    },
  );

  const controls = [
    ["pause", pausePartyPlayback],
    ["resume", resumePartyPlayback],
    ["skip", skipPartyPlayback],
  ] as const;

  for (const [action, control] of controls) {
    router.post(
      `/organizer/parties/:partyId/playback/${action}`,
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
