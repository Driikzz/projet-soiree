import { Router } from "express";

import { addTrackRequestSchema, uuidSchema } from "@songfest/shared";

import { createRateLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import { publishTrackAdded } from "../../socket/realtime-publisher.js";
import {
  requireParticipant,
  requireParticipantCsrf,
  requireTrustedOrigin,
} from "../auth/auth.middleware.js";
import { addPlaylistTrack, listPlaylistTracks } from "./track.service.js";

const addTrackLimiter = createRateLimiter(60 * 1_000, 15);

export const createTrackRouter = () => {
  const router = Router();

  router.get("/playlists/:playlistId/tracks", requireParticipant, async (request, response) => {
    const playlistId = uuidSchema.parse(request.params.playlistId);
    const result = await listPlaylistTracks(request.participantAuth!.participant.id, playlistId);
    response.json(result);
  });

  router.post(
    "/playlists/:playlistId/tracks",
    requireTrustedOrigin,
    requireParticipant,
    requireParticipantCsrf,
    addTrackLimiter,
    validateBody(addTrackRequestSchema),
    async (request, response) => {
      const playlistId = uuidSchema.parse(request.params.playlistId);
      const result = await addPlaylistTrack(
        request.participantAuth!.participant.id,
        playlistId,
        request.body,
      );
      response.status(201).json(result);
      void publishTrackAdded(playlistId, result.track.id);
    },
  );

  return router;
};
