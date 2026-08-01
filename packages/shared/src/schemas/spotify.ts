import { z } from "zod";

import { uuidSchema } from "./common.js";
import { spotifyTrackSnapshotSchema } from "./tracks.js";
import { playlistTrackSchema } from "./tracks.js";

export const spotifyConnectionStatusSchema = z.object({
  isConfigured: z.boolean(),
  isConnected: z.boolean(),
  connectedAt: z.string().datetime().nullable(),
  refreshTokenExpiresAt: z.string().datetime().nullable(),
  scopes: z.array(z.string()),
});

export const spotifyAuthorizationResponseSchema = z.object({
  authorizationUrl: z.string().url(),
});

export const spotifyConnectRequestSchema = z.object({
  partyId: uuidSchema,
});

export const spotifyDeviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  isActive: z.boolean(),
  isRestricted: z.boolean(),
  volumePercent: z.number().int().min(0).max(100).nullable(),
  isSelected: z.boolean(),
});

export const selectSpotifyDeviceRequestSchema = z.object({
  deviceId: z.string().min(1).max(255),
});

export const spotifyPlaybackSchema = z.object({
  device: spotifyDeviceSchema.nullable(),
  track: spotifyTrackSnapshotSchema.nullable(),
  progressMs: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  isPlaying: z.boolean(),
  serverTimestamp: z.number().int().nonnegative(),
});

export const partyPlaybackSchema = z.object({
  currentTrack: playlistTrackSchema.nullable(),
  queuedTrack: playlistTrackSchema.nullable(),
  activePlaylistId: uuidSchema.nullable(),
  scheduledPlaylistId: uuidSchema.nullable(),
  progressMs: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  isPlaying: z.boolean(),
  skipVote: z.object({
    voteCount: z.number().int().nonnegative(),
    requiredVotes: z.number().int().positive(),
    participantHasVoted: z.boolean(),
    isAvailable: z.boolean(),
  }),
  lastSyncedAt: z.string().datetime().nullable(),
  serverTimestamp: z.number().int().nonnegative(),
});

export const spotifySearchQuerySchema = z.object({
  partyId: uuidSchema,
  q: z.string().trim().min(2).max(100),
});

export const spotifySearchResponseSchema = z.object({
  tracks: z.array(spotifyTrackSnapshotSchema).max(10),
});

export type SpotifyConnectionStatus = z.infer<typeof spotifyConnectionStatusSchema>;
export type SpotifyDevice = z.infer<typeof spotifyDeviceSchema>;
export type SelectSpotifyDeviceRequest = z.infer<typeof selectSpotifyDeviceRequestSchema>;
export type SpotifyPlayback = z.infer<typeof spotifyPlaybackSchema>;
export type PartyPlayback = z.infer<typeof partyPlaybackSchema>;
export type SpotifySearchQuery = z.infer<typeof spotifySearchQuerySchema>;
export type SpotifySearchResponse = z.infer<typeof spotifySearchResponseSchema>;
