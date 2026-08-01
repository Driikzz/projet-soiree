import { env } from "../../config/env.js";
import { AppError } from "../../errors/app-error.js";

export interface SpotifyConfiguration {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encryptionKey: Buffer;
}

export const isSpotifyConfigured = () =>
  env.SPOTIFY_CLIENT_ID !== undefined &&
  env.SPOTIFY_CLIENT_SECRET !== undefined &&
  env.SPOTIFY_REDIRECT_URI !== undefined &&
  env.SPOTIFY_TOKEN_ENCRYPTION_KEY !== undefined;

export const getSpotifyConfiguration = (): SpotifyConfiguration => {
  if (
    env.SPOTIFY_CLIENT_ID === undefined ||
    env.SPOTIFY_CLIENT_SECRET === undefined ||
    env.SPOTIFY_REDIRECT_URI === undefined ||
    env.SPOTIFY_TOKEN_ENCRYPTION_KEY === undefined
  ) {
    throw new AppError(
      503,
      "SPOTIFY_CONFIGURATION_REQUIRED",
      "La configuration Spotify du serveur est incomplète.",
    );
  }

  return {
    clientId: env.SPOTIFY_CLIENT_ID,
    clientSecret: env.SPOTIFY_CLIENT_SECRET,
    redirectUri: env.SPOTIFY_REDIRECT_URI,
    encryptionKey: Buffer.from(env.SPOTIFY_TOKEN_ENCRYPTION_KEY, "base64"),
  };
};
