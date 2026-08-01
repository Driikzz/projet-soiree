import { z } from "zod";

export const spotifyTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("Bearer"),
  scope: z.string().default(""),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1).optional(),
});

export const spotifyErrorResponseSchema = z.object({
  error: z
    .union([
      z.string(),
      z.object({
        status: z.number().optional(),
        message: z.string().optional(),
      }),
    ])
    .optional(),
  error_description: z.string().optional(),
  reason: z.string().optional(),
});

export const spotifyProfileSchema = z
  .object({
    account_id: z.string().min(1).optional(),
    id: z.string().min(1).optional(),
  })
  .refine((profile) => profile.account_id !== undefined || profile.id !== undefined);

const spotifyImageSchema = z.object({
  url: z.string().url(),
  height: z.number().int().nullable().optional(),
  width: z.number().int().nullable().optional(),
});

const spotifyArtistSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const spotifyTrackSchema = z.object({
  id: z.string().min(1),
  uri: z.string().startsWith("spotify:track:"),
  name: z.string().min(1),
  duration_ms: z.number().int().positive(),
  explicit: z.boolean(),
  is_local: z.boolean().default(false),
  external_urls: z.object({
    spotify: z.string().url(),
  }),
  artists: z.array(spotifyArtistSchema).min(1),
  album: z.object({
    images: z.array(spotifyImageSchema),
  }),
});

export const spotifySearchResponseExternalSchema = z.object({
  tracks: z.object({
    items: z.array(z.unknown()),
  }),
});

export const spotifyDeviceExternalSchema = z.object({
  id: z.string().min(1).nullable(),
  is_active: z.boolean(),
  is_restricted: z.boolean(),
  name: z.string().min(1),
  type: z.string().min(1),
  volume_percent: z.number().int().min(0).max(100).nullable(),
});

export const spotifyDevicesResponseSchema = z.object({
  devices: z.array(spotifyDeviceExternalSchema),
});

export const spotifyPlaybackExternalSchema = z.object({
  device: spotifyDeviceExternalSchema.optional(),
  progress_ms: z.number().int().nonnegative().nullable(),
  is_playing: z.boolean(),
  item: z.unknown().nullable(),
});
