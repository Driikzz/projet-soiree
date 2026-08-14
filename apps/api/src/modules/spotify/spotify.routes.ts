import { Router } from "express";
import { z } from "zod";

import {
  selectSpotifyDeviceRequestSchema,
  spotifyConnectRequestSchema,
  spotifySearchQuerySchema,
  uuidSchema,
} from "@songfest/shared";

import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { createRateLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import {
  requireAdmin,
  requireAdminCsrf,
  requireParticipant,
  requireTrustedOrigin,
} from "../auth/auth.middleware.js";
import { getAdminParty } from "../parties/party.service.js";
import { SPOTIFY_OAUTH_STATE_COOKIE } from "./spotify.constants.js";
import { createSpotifyAuthorization, validateSpotifyOAuthState } from "./spotify-oauth.service.js";
import {
  getSpotifyDevices,
  getSpotifyPlayback,
  searchSpotifyTracks,
  selectSpotifyDevice,
} from "./spotify.service.js";
import {
  exchangeSpotifyAuthorizationCode,
  getSpotifyConnectionStatus,
} from "./spotify-token.service.js";

const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1).max(2_000).optional(),
  state: z.string().min(1).max(500).optional(),
  error: z.string().min(1).max(200).optional(),
});

const searchLimiter = createRateLimiter(60 * 1_000, 30);

const spotifyRedirect = (
  status: "connected" | "denied" | "error",
  partyId: string,
  reason?: string,
) => {
  const redirect = new URL(`/organizer/parties/${partyId}/spotify`, env.WEB_ORIGIN);
  redirect.searchParams.set("spotify", status);
  if (reason !== undefined) {
    redirect.searchParams.set("reason", reason);
  }
  return redirect.toString();
};

const getOAuthFailureReason = (error: unknown) => {
  if (error instanceof Error && "code" in error) {
    const code = String(error.code);
    if (code === "SPOTIFY_AUTH_REQUIRED") {
      return "callback";
    }
    if (code === "SPOTIFY_REQUEST_FAILED") {
      return "unavailable";
    }
  }
  return "oauth";
};

export const createSpotifyRouter = () => {
  const router = Router();

  router.get(
    "/organizer/parties/:partyId/spotify/status",
    requireAdmin,
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      await getAdminParty(request.adminAuth!.admin.id, partyId);
      const status = await getSpotifyConnectionStatus(request.adminAuth!.admin.id);
      response.json(status);
    },
  );

  router.post(
    "/organizer/spotify/connect",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    validateBody(spotifyConnectRequestSchema),
    async (request, response) => {
      await getAdminParty(request.adminAuth!.admin.id, request.body.partyId);
      response.json({
        authorizationUrl: createSpotifyAuthorization(response, request.body.partyId),
      });
    },
  );

  router.get("/spotify/callback", requireAdmin, async (request, response) => {
    const query = oauthCallbackQuerySchema.parse(request.query);
    const partyId = validateSpotifyOAuthState(
      response,
      request.cookies[SPOTIFY_OAUTH_STATE_COOKIE] as string | undefined,
      query.state,
    );
    await getAdminParty(request.adminAuth!.admin.id, partyId);

    if (query.error !== undefined || query.code === undefined) {
      response.redirect(spotifyRedirect("denied", partyId));
      return;
    }

    try {
      await exchangeSpotifyAuthorizationCode(request.adminAuth!.admin.id, query.code);
      response.redirect(spotifyRedirect("connected", partyId));
    } catch (error: unknown) {
      logger.warn(
        {
          errorCode: error instanceof Error && "code" in error ? String(error.code) : "unknown",
          errorMessage: error instanceof Error ? error.message : "unknown",
          errorDetails: error instanceof Error && "details" in error ? error.details : undefined,
          adminId: request.adminAuth!.admin.id,
          redirectUri: env.SPOTIFY_REDIRECT_URI,
        },
        "Spotify OAuth callback failed",
      );
      response.redirect(spotifyRedirect("error", partyId, getOAuthFailureReason(error)));
    }
  });

  router.get(
    "/organizer/parties/:partyId/spotify/devices",
    requireAdmin,
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const devices = await getSpotifyDevices(request.adminAuth!.admin.id, partyId);
      response.json({ devices });
    },
  );

  router.put(
    "/organizer/parties/:partyId/spotify/device",
    requireTrustedOrigin,
    requireAdmin,
    requireAdminCsrf,
    validateBody(selectSpotifyDeviceRequestSchema),
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const device = await selectSpotifyDevice(
        request.adminAuth!.admin.id,
        partyId,
        request.body.deviceId,
      );
      response.json({ device });
    },
  );

  router.get(
    "/organizer/parties/:partyId/spotify/playback",
    requireAdmin,
    async (request, response) => {
      const partyId = uuidSchema.parse(request.params.partyId);
      const playback = await getSpotifyPlayback(request.adminAuth!.admin.id, partyId);
      response.json(playback);
    },
  );

  router.get("/spotify/search", requireParticipant, searchLimiter, async (request, response) => {
    const query = spotifySearchQuerySchema.parse(request.query);
    const tracks = await searchSpotifyTracks(
      request.participantAuth!.participant.id,
      query.partyId,
      query.q,
    );
    response.json({ tracks });
  });

  return router;
};
