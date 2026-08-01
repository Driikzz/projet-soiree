import { z } from "zod";

import { uuidSchema } from "./common.js";

export const playlistVisualKeySchema = z.enum([
  "sunset",
  "pixel",
  "bass",
  "pulse",
  "midnight",
  "free",
]);

const playlistNameSchema = z
  .string()
  .trim()
  .min(2, "Le nom doit contenir au moins 2 caractères.")
  .max(80, "Le nom ne peut pas dépasser 80 caractères.");
const playlistDescriptionSchema = z
  .string()
  .trim()
  .max(500, "La description ne peut pas dépasser 500 caractères.")
  .nullable();
const playlistQuotaSchema = z
  .number()
  .int()
  .min(0, "Le quota ne peut pas être négatif.")
  .max(50, "Le quota ne peut pas dépasser 50.");

export const createPlaylistRequestSchema = z.object({
  name: playlistNameSchema,
  description: playlistDescriptionSchema.default(null),
  visualKey: playlistVisualKeySchema,
  quotaPerParticipant: playlistQuotaSchema.default(5),
  isOpen: z.boolean().default(true),
  trackVotesEnabled: z.boolean().default(true),
  explicitContentAllowed: z.boolean().default(false),
});

export const updatePlaylistRequestSchema = z
  .object({
    name: playlistNameSchema.optional(),
    description: playlistDescriptionSchema.optional(),
    visualKey: playlistVisualKeySchema.optional(),
    quotaPerParticipant: playlistQuotaSchema.optional(),
    isOpen: z.boolean().optional(),
    trackVotesEnabled: z.boolean().optional(),
    explicitContentAllowed: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0, "Au moins une modification est requise.");

export const playlistSummarySchema = z.object({
  id: uuidSchema,
  partyId: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  visualKey: playlistVisualKeySchema,
  quotaPerParticipant: z.number().int().nonnegative(),
  isOpen: z.boolean(),
  trackVotesEnabled: z.boolean(),
  explicitContentAllowed: z.boolean(),
  isActive: z.boolean(),
  isScheduled: z.boolean(),
  trackCount: z.number().int().nonnegative(),
  contributorCount: z.number().int().nonnegative(),
  playlistVoteCount: z.number().int().nonnegative(),
  participantHasVoted: z.boolean().optional(),
  participantTrackCount: z.number().int().nonnegative().optional(),
  extraTrackQuota: z.number().int().nonnegative().optional(),
  remainingTrackQuota: z.number().int().nonnegative().optional(),
  activatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const playlistVoteRequestSchema = z.object({
  playlistId: uuidSchema,
});

export const playlistChangeStateSchema = z.object({
  activeParticipantCount: z.number().int().nonnegative(),
  requiredVotes: z.number().int().nonnegative(),
  remainingLockMs: z.number().int().nonnegative(),
  votesEnabled: z.boolean(),
  lockedByAdmin: z.boolean(),
  scheduledPlaylistId: uuidSchema.nullable(),
});

export const playlistVoteResultSchema = z.object({
  playlistId: uuidSchema,
  voteCount: z.number().int().nonnegative(),
  participantHasVoted: z.boolean(),
  change: playlistChangeStateSchema,
});

export type CreatePlaylistRequest = z.infer<typeof createPlaylistRequestSchema>;
export type UpdatePlaylistRequest = z.infer<typeof updatePlaylistRequestSchema>;
export type PlaylistSummary = z.infer<typeof playlistSummarySchema>;
export type PlaylistVisualKey = z.infer<typeof playlistVisualKeySchema>;
export type PlaylistChangeState = z.infer<typeof playlistChangeStateSchema>;
export type PlaylistVoteResult = z.infer<typeof playlistVoteResultSchema>;
