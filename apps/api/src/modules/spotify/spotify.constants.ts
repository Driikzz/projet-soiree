export const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com";
export const SPOTIFY_API_URL = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-playback-state",
  "user-read-currently-playing",
  "user-modify-playback-state",
] as const;

export const SPOTIFY_OAUTH_STATE_COOKIE = "songfest_spotify_oauth_state";
export const SPOTIFY_OAUTH_STATE_DURATION_MS = 10 * 60 * 1_000;
export const SPOTIFY_ACCESS_TOKEN_MARGIN_MS = 60 * 1_000;
