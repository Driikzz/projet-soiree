import { z } from "zod";

import { trackStatusSchema, uuidSchema } from "./common.js";

export const spotifyTrackSnapshotSchema = z.object({
  spotifyTrackId: z.string().min(1).max(64),
  spotifyUri: z.string().startsWith("spotify:track:").max(128),
  spotifyUrl: z.string().url().max(500),
  title: z.string().min(1).max(300),
  artistNames: z.array(z.string().min(1).max(200)).min(1).max(20),
  spotifyArtistIds: z.array(z.string().min(1).max(64)).min(1).max(20),
  coverUrl: z.string().url().max(500).nullable(),
  durationMs: z.number().int().positive(),
  isExplicit: z.boolean(),
});

export const addTrackRequestSchema = z.object({
  spotifyTrackId: z.string().min(1).max(64),
  rewardId: uuidSchema.optional(),
});

export const trackContributorSchema = z.object({
  id: uuidSchema,
  nickname: z.string(),
  avatarSeed: z.string(),
});

export const playlistTrackSchema = spotifyTrackSnapshotSchema.extend({
  id: uuidSchema,
  playlistId: uuidSchema,
  proposedBy: trackContributorSchema.nullable(),
  voteCount: z.number().int().nonnegative(),
  status: trackStatusSchema,
  createdAt: z.string().datetime(),
});

export const participantPlaylistTrackSchema = playlistTrackSchema.extend({
  participantHasVoted: z.boolean(),
  participantFlameCount: z.number().int().min(0).max(3),
  voteSupporterCount: z.number().int().nonnegative(),
  voteScore: z.number().int().min(0).max(100),
});

export const trackFlameBudgetSchema = z.object({
  total: z.number().int().positive(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  maxPerTrack: z.number().int().positive(),
});

export const trackVoteResultSchema = z.object({
  trackId: uuidSchema,
  voteCount: z.number().int().nonnegative(),
  participantHasVoted: z.boolean(),
  participantFlameCount: z.number().int().min(0).max(3),
  voteSupporterCount: z.number().int().nonnegative(),
  voteScore: z.number().int().min(0).max(100),
  flameBudget: trackFlameBudgetSchema,
});

export const participantTrackQuotaSchema = z.object({
  baseQuota: z.number().int().nonnegative(),
  extraTrackUses: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
});

export const trackVoteRequestSchema = z.object({
  trackId: uuidSchema,
});

export type SpotifyTrackSnapshot = z.infer<typeof spotifyTrackSnapshotSchema>;
export type AddTrackRequest = z.infer<typeof addTrackRequestSchema>;
export type PlaylistTrack = z.infer<typeof playlistTrackSchema>;
export type ParticipantPlaylistTrack = z.infer<typeof participantPlaylistTrackSchema>;
export type TrackFlameBudget = z.infer<typeof trackFlameBudgetSchema>;
export type ParticipantTrackQuota = z.infer<typeof participantTrackQuotaSchema>;
export type TrackVoteResult = z.infer<typeof trackVoteResultSchema>;
