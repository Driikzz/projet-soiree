import { fileURLToPath } from "node:url";

import { config as loadEnvironment } from "dotenv";
import { z } from "zod";

loadEnvironment({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
  quiet: true,
});

const developmentSessionSecret = "development-only-session-secret-change-me";
const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("0.0.0.0"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    WEB_ORIGIN: z
      .string()
      .url()
      .default("http://127.0.0.1:5173")
      .transform((value) => new URL(value).origin),
    DATABASE_URL: z
      .string()
      .url()
      .default("postgresql://songfest:songfest@localhost:5432/songfest"),
    SESSION_SECRET: z.string().min(32).default(developmentSessionSecret),
    SPOTIFY_CLIENT_ID: optionalString,
    SPOTIFY_CLIENT_SECRET: optionalString,
    SPOTIFY_REDIRECT_URI: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().url().optional(),
    ),
    SPOTIFY_TOKEN_ENCRYPTION_KEY: optionalString,
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    TRUST_PROXY: z
      .enum(["false", "1", "2"])
      .default("false")
      .transform((value) => (value === "false" ? false : Number(value))),
    PLAYBACK_SYNC_INTERVAL_MS: z.coerce.number().int().min(5_000).max(60_000).default(15_000),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && value.SESSION_SECRET === developmentSessionSecret) {
      context.addIssue({
        code: "custom",
        path: ["SESSION_SECRET"],
        message: "must be replaced in production",
      });
    }

    const spotifyValues = [
      value.SPOTIFY_CLIENT_ID,
      value.SPOTIFY_CLIENT_SECRET,
      value.SPOTIFY_REDIRECT_URI,
      value.SPOTIFY_TOKEN_ENCRYPTION_KEY,
    ];
    const configuredSpotifyValues = spotifyValues.filter((item) => item !== undefined);
    if (configuredSpotifyValues.length > 0 && configuredSpotifyValues.length !== 4) {
      context.addIssue({
        code: "custom",
        path: ["SPOTIFY_CLIENT_ID"],
        message: "all Spotify configuration values must be provided together",
      });
    }

    if (value.SPOTIFY_TOKEN_ENCRYPTION_KEY !== undefined) {
      const decodedKey = Buffer.from(value.SPOTIFY_TOKEN_ENCRYPTION_KEY, "base64");
      if (decodedKey.length !== 32) {
        context.addIssue({
          code: "custom",
          path: ["SPOTIFY_TOKEN_ENCRYPTION_KEY"],
          message: "must be a base64-encoded 32-byte key",
        });
      }
    }

    if (value.SPOTIFY_REDIRECT_URI !== undefined) {
      const redirectUri = new URL(value.SPOTIFY_REDIRECT_URI);
      if (redirectUri.origin !== value.WEB_ORIGIN) {
        context.addIssue({
          code: "custom",
          path: ["SPOTIFY_REDIRECT_URI"],
          message: "must use the same origin as WEB_ORIGIN",
        });
      }
      if (redirectUri.pathname !== "/api/spotify/callback") {
        context.addIssue({
          code: "custom",
          path: ["SPOTIFY_REDIRECT_URI"],
          message: "must end with /api/spotify/callback",
        });
      }
    }
  });

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues.map((issue) => ({
    key: issue.path.join("."),
    message: issue.message,
  }));

  throw new Error(`Invalid environment configuration: ${JSON.stringify(issues)}`);
}

export const env = result.data;
