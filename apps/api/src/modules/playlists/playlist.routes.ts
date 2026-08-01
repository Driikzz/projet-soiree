import { Router } from "express";

import {
  createPlaylistRequestSchema,
  updatePlaylistRequestSchema,
  uuidSchema,
} from "@songfest/shared";

import { validateBody } from "../../middleware/validate.js";
import {
  publishPartyResync,
  publishPlaylistActivated,
  publishPlaylistCreated,
  publishPlaylistUpdated,
} from "../../socket/realtime-publisher.js";
import {
  requireAdmin,
  requireAdminCsrf,
  requireParticipant,
  requireTrustedOrigin,
} from "../auth/auth.middleware.js";
import {
  activatePlaylist,
  createPlaylist,
  deletePlaylist,
  listAdminPlaylists,
  listParticipantPlaylists,
  updatePlaylist,
} from "./playlist.service.js";
import { getPlaylistChangeState } from "../votes/playlist-vote.service.js";

export const createAdminPlaylistRouter = () => {
  const router = Router();

  router.get("/parties/:partyId/playlists", requireAdmin, async (request, response) => {
    const partyId = uuidSchema.parse(request.params.partyId);
    const playlists = await listAdminPlaylists(request.adminAuth!.admin.id, partyId);
    response.json({ playlists });
  });

  router.post(
    "/parties/:partyId/playlists",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    validateBody(createPlaylistRequestSchema),
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const playlist = await createPlaylist(request.adminAuth!.admin.id, partyId, request.body);
      response.status(201).json({ playlist });
      void publishPlaylistCreated(partyId, playlist.id);
    },
  );

  router.patch(
    "/playlists/:playlistId",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    validateBody(updatePlaylistRequestSchema),
    async (request, response) => {
      const playlistId = uuidSchema.parse(request.params.playlistId);
      const playlist = await updatePlaylist(request.adminAuth!.admin.id, playlistId, request.body);
      response.json({ playlist });
      void publishPlaylistUpdated(playlistId);
    },
  );

  router.post(
    "/playlists/:playlistId/activate",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    async (request, response) => {
      const playlistId = uuidSchema.parse(request.params.playlistId);
      const playlist = await activatePlaylist(request.adminAuth!.admin.id, playlistId);
      response.json({ playlist });
      void publishPlaylistActivated(playlistId);
    },
  );

  router.delete(
    "/playlists/:playlistId",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    async (request, response) => {
      const playlistId = uuidSchema.parse(request.params.playlistId);
      const { partyId } = await deletePlaylist(request.adminAuth!.admin.id, playlistId);
      response.status(204).end();
      void publishPartyResync(partyId, ["party", "playlists"]);
    },
  );

  return router;
};

export const createParticipantPlaylistRouter = () => {
  const router = Router();

  router.get("/parties/:partyId/playlists", requireParticipant, async (request, response) => {
    const partyId = uuidSchema.parse(request.params.partyId);
    const participantId = request.participantAuth!.participant.id;
    const [playlists, playlistChange] = await Promise.all([
      listParticipantPlaylists(participantId, partyId),
      getPlaylistChangeState(participantId, partyId),
    ]);
    response.json({ playlists, playlistChange });
  });

  return router;
};
