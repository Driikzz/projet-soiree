import { Router } from "express";

import { uuidSchema } from "@songfest/shared";

import { createRateLimiter } from "../../middleware/rate-limit.js";
import {
  publishPlaylistVoteUpdated,
  publishTrackVoteUpdated,
} from "../../socket/realtime-publisher.js";
import {
  requireParticipant,
  requireParticipantCsrf,
  requireTrustedOrigin,
} from "../auth/auth.middleware.js";
import { addTrackVote, removeTrackVote } from "./track-vote.service.js";
import { addPlaylistVote, removePlaylistVote } from "./playlist-vote.service.js";

const voteLimiter = createRateLimiter(60 * 1_000, 60);

export const createVoteRouter = () => {
  const router = Router();

  router.post(
    "/tracks/:trackId/votes",
    requireTrustedOrigin,
    requireParticipant,
    requireParticipantCsrf,
    voteLimiter,
    async (request, response) => {
      const trackId = uuidSchema.parse(request.params.trackId);
      const vote = await addTrackVote(request.participantAuth!.participant.id, trackId);
      response.status(201).json({ vote });
      void publishTrackVoteUpdated(trackId, vote.voteCount);
    },
  );

  router.delete(
    "/tracks/:trackId/votes",
    requireTrustedOrigin,
    requireParticipant,
    requireParticipantCsrf,
    voteLimiter,
    async (request, response) => {
      const trackId = uuidSchema.parse(request.params.trackId);
      const vote = await removeTrackVote(request.participantAuth!.participant.id, trackId);
      response.json({ vote });
      void publishTrackVoteUpdated(trackId, vote.voteCount);
    },
  );

  router.post(
    "/playlists/:playlistId/votes",
    requireTrustedOrigin,
    requireParticipant,
    requireParticipantCsrf,
    voteLimiter,
    async (request, response) => {
      const playlistId = uuidSchema.parse(request.params.playlistId);
      const vote = await addPlaylistVote(request.participantAuth!.participant.id, playlistId);
      response.status(201).json({ vote });
      void publishPlaylistVoteUpdated(
        playlistId,
        vote.voteCount,
        vote.change.scheduledPlaylistId === playlistId,
      );
    },
  );

  router.delete(
    "/playlists/:playlistId/votes",
    requireTrustedOrigin,
    requireParticipant,
    requireParticipantCsrf,
    voteLimiter,
    async (request, response) => {
      const playlistId = uuidSchema.parse(request.params.playlistId);
      const vote = await removePlaylistVote(request.participantAuth!.participant.id, playlistId);
      response.json({ vote });
      void publishPlaylistVoteUpdated(playlistId, vote.voteCount, false);
    },
  );

  return router;
};
