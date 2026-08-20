import { z } from "zod";

import { nicknameSchema, partyCodeSchema, partyStatusSchema, uuidSchema } from "./common.js";

export const createPartyRequestSchema = z.object({
  name: z.string().trim().min(3).max(120),
  location: z.string().trim().max(160).optional(),
  scheduledFor: z.string().datetime().optional(),
});

export const joinPartyRequestSchema = z.object({
  nickname: nicknameSchema,
  avatarSeed: z.string().trim().min(1).max(64).optional(),
});

export const partySettingsSchema = z.object({
  defaultTrackQuota: z.number().int().min(0).max(50),
  flameBudgetPerParticipant: z.number().int().min(1).max(50),
  maxTrackDurationMs: z.number().int().min(30_000).max(3_600_000),
  replayBlockMinutes: z.number().int().min(0).max(10_080),
  minimumPlaylistVotes: z.number().int().min(1).max(1_000),
  minimumPlaylistVotePercentage: z.number().int().min(1).max(100),
  playlistLockMinutes: z.number().int().min(0).max(1_440),
  playlistVotesEnabled: z.boolean(),
  playlistChangeLockedByAdmin: z.boolean(),
  flashModeEnabled: z.boolean(),
  flashIntervalMinutes: z.number().int().min(5).max(1_440),
  flashSelectionWindowSeconds: z.number().int().min(30).max(600),
  nextFlashTurnAt: z.string().datetime().nullable(),
});

export const partySummarySchema = z.object({
  id: uuidSchema,
  code: partyCodeSchema,
  name: z.string(),
  status: partyStatusSchema,
  activePlaylistId: uuidSchema.nullable(),
  scheduledPlaylistId: uuidSchema.nullable(),
  stateVersion: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  location: z.string().nullable(),
  scheduledFor: z.string().datetime().nullable(),
  activeParticipantCount: z.number().int().nonnegative(),
  selectedDeviceId: z.string().nullable(),
});

export const publicPartySchema = partySummarySchema
  .pick({
    id: true,
    code: true,
    name: true,
    status: true,
    activePlaylistId: true,
    scheduledPlaylistId: true,
    stateVersion: true,
    createdAt: true,
    location: true,
    scheduledFor: true,
    activeParticipantCount: true,
  })
  .extend({
    participantPreview: z
      .array(
        z.object({
          nickname: nicknameSchema,
          avatarSeed: z.string(),
        }),
      )
      .max(5),
  });

export const participantSummarySchema = z.object({
  id: uuidSchema,
  partyId: uuidSchema,
  nickname: nicknameSchema,
  avatarSeed: z.string(),
});

export const participantSessionSchema = z.object({
  participant: participantSummarySchema,
  party: publicPartySchema,
});

export const partyPersonSchema = z.object({
  id: uuidSchema,
  nickname: nicknameSchema,
  avatarSeed: z.string(),
  contributionCount: z.number().int().nonnegative(),
  isCurrent: z.boolean(),
});

export const partyPeopleSchema = z.object({
  host: z.object({ displayName: z.string().min(1) }),
  participants: z.array(partyPersonSchema),
});

export type CreatePartyRequest = z.infer<typeof createPartyRequestSchema>;
export type JoinPartyRequest = z.infer<typeof joinPartyRequestSchema>;
export type PartySettings = z.infer<typeof partySettingsSchema>;
export type PartySummary = z.infer<typeof partySummarySchema>;
export type PublicParty = z.infer<typeof publicPartySchema>;
export type ParticipantSummary = z.infer<typeof participantSummarySchema>;
export type ParticipantSession = z.infer<typeof participantSessionSchema>;
export type PartyPerson = z.infer<typeof partyPersonSchema>;
export type PartyPeople = z.infer<typeof partyPeopleSchema>;
