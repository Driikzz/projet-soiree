import type { ErrorCode } from "@songfest/shared";
import type { ZodType } from "zod";

import { AppError } from "../../errors/app-error.js";
import { SPOTIFY_API_URL } from "./spotify.constants.js";
import { spotifyErrorResponseSchema } from "./spotify.external-schemas.js";
import { getSpotifyAccessToken } from "./spotify-token.service.js";

const parseJson = async (response: Response): Promise<unknown> =>
  response.json().catch(() => undefined);

interface SpotifyErrorMapping {
  notFound?: {
    code: ErrorCode;
    message: string;
  };
}

const throwSpotifyApiError = async (
  response: Response,
  errorMapping: SpotifyErrorMapping,
): Promise<never> => {
  const payload = spotifyErrorResponseSchema.safeParse(await parseJson(response));
  const reason = payload.success ? payload.data.reason : undefined;

  if (response.status === 401) {
    throw new AppError(401, "SPOTIFY_AUTH_REQUIRED", "La connexion Spotify doit être renouvelée.");
  }

  if (response.status === 429) {
    if (reason === "QUOTA_EXCEEDED") {
      throw new AppError(
        429,
        "SPOTIFY_QUOTA_EXCEEDED",
        "Le quota Spotify de développement est épuisé. Réessaie plus tard.",
      );
    }

    throw new AppError(
      429,
      "RATE_LIMITED",
      "Spotify demande de ralentir les requêtes. Réessaie dans un instant.",
      {
        retryAfter: response.headers.get("retry-after"),
      },
    );
  }

  if (response.status === 403) {
    throw new AppError(
      403,
      "SPOTIFY_REQUEST_FAILED",
      "Spotify a refusé cette action. Vérifie le compte Premium et les autorisations.",
    );
  }

  if (response.status === 404 && errorMapping.notFound !== undefined) {
    throw new AppError(404, errorMapping.notFound.code, errorMapping.notFound.message);
  }

  throw new AppError(502, "SPOTIFY_REQUEST_FAILED", "Spotify n’a pas pu traiter la requête.");
};

const spotifyFetch = async (
  adminId: string,
  path: string,
  options: RequestInit = {},
  canRetry = true,
  errorMapping: SpotifyErrorMapping = {},
) => {
  const accessToken = await getSpotifyAccessToken(adminId);
  const response = await fetch(`${SPOTIFY_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...options.headers,
    },
  }).catch(() => {
    throw new AppError(502, "SPOTIFY_REQUEST_FAILED", "Spotify est momentanément inaccessible.");
  });

  if (response.status === 401 && canRetry) {
    await getSpotifyAccessToken(adminId, true);
    return spotifyFetch(adminId, path, options, false, errorMapping);
  }

  if (!response.ok) {
    await throwSpotifyApiError(response, errorMapping);
  }

  return response;
};

export const getSpotifyJson = async <Result>(
  adminId: string,
  path: string,
  schema: ZodType<Result>,
  errorMapping: SpotifyErrorMapping = {},
) => {
  const response = await spotifyFetch(adminId, path, {}, true, errorMapping);
  if (response.status === 204) {
    return null;
  }

  const result = schema.safeParse(await parseJson(response));
  if (!result.success) {
    throw new AppError(502, "SPOTIFY_REQUEST_FAILED", "Spotify a renvoyé une réponse inattendue.");
  }

  return result.data;
};

export const sendSpotifyCommand = async (
  adminId: string,
  path: string,
  options: Pick<RequestInit, "method" | "body" | "headers">,
  errorMapping: SpotifyErrorMapping = {},
) => {
  await spotifyFetch(adminId, path, options, true, errorMapping);
};
