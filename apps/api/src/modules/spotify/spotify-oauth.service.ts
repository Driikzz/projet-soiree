import { timingSafeEqual } from "node:crypto";

import type { CookieOptions, Response } from "express";
import { z } from "zod";

import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";
import { createOpaqueToken } from "../auth/session-crypto.js";
import {
  SPOTIFY_ACCOUNTS_URL,
  SPOTIFY_OAUTH_STATE_COOKIE,
  SPOTIFY_OAUTH_STATE_DURATION_MS,
  SPOTIFY_SCOPES,
} from "./spotify.constants.js";
import { getSpotifyConfiguration } from "./spotify.config.js";

const oauthCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  path: "/api/spotify/callback",
};

const oauthStateSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:[A-Za-z0-9_-]{40,}$/,
  );

export const createSpotifyAuthorization = (response: Response, partyId: string) => {
  const configuration = getSpotifyConfiguration();
  const state = `${partyId}:${createOpaqueToken()}`;
  const expires = new Date(Date.now() + SPOTIFY_OAUTH_STATE_DURATION_MS);

  response.cookie(SPOTIFY_OAUTH_STATE_COOKIE, state, {
    ...oauthCookieOptions,
    expires,
  });

  const authorizationUrl = new URL(`${SPOTIFY_ACCOUNTS_URL}/authorize`);
  authorizationUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: configuration.clientId,
    redirect_uri: configuration.redirectUri,
    scope: SPOTIFY_SCOPES.join(" "),
    state,
    show_dialog: "true",
  }).toString();

  return authorizationUrl.toString();
};

export const validateSpotifyOAuthState = (
  response: Response,
  cookieState: string | undefined,
  queryState: string | undefined,
) => {
  response.clearCookie(SPOTIFY_OAUTH_STATE_COOKIE, oauthCookieOptions);

  if (cookieState === undefined || queryState === undefined) {
    throw new AppError(403, "SPOTIFY_OAUTH_FAILED", "La requête Spotify a expiré.");
  }

  const state = oauthStateSchema.safeParse(queryState);
  if (!state.success) {
    throw new AppError(403, "SPOTIFY_OAUTH_FAILED", "La requête Spotify est invalide.");
  }

  const cookieBuffer = Buffer.from(cookieState, "utf8");
  const queryBuffer = Buffer.from(queryState, "utf8");
  if (cookieBuffer.length !== queryBuffer.length || !timingSafeEqual(cookieBuffer, queryBuffer)) {
    throw new AppError(403, "SPOTIFY_OAUTH_FAILED", "La requête Spotify est invalide.");
  }

  return state.data.slice(0, state.data.indexOf(":"));
};
