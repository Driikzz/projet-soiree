import { z } from "zod";

import { flashTurnStatusSchema, uuidSchema } from "./common.js";

export const flashParticipantSchema = z.object({
  id: uuidSchema,
  nickname: z.string(),
  avatarSeed: z.string(),
});

export const flashTrackSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  artistNames: z.array(z.string()),
  coverUrl: z.string().url().nullable(),
});

export const flashTurnSchema = z.object({
  id: uuidSchema,
  partyId: uuidSchema,
  participant: flashParticipantSchema,
  playlistId: uuidSchema,
  status: flashTurnStatusSchema,
  startedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  submittedAt: z.string().datetime().nullable(),
  track: flashTrackSchema.nullable(),
});

export const flashStateSchema = z.object({
  enabled: z.boolean(),
  intervalMinutes: z.number().int().min(5).max(1_440),
  selectionWindowSeconds: z.number().int().min(30).max(600),
  nextFlashTurnAt: z.string().datetime().nullable(),
  isCurrentParticipant: z.boolean(),
  turn: flashTurnSchema.nullable(),
});

export const submitFlashTrackRequestSchema = z
  .object({
    spotifyTrackId: z.string().trim().min(1).max(64),
  })
  .strict();

export type FlashTurn = z.infer<typeof flashTurnSchema>;
export type FlashState = z.infer<typeof flashStateSchema>;
export type SubmitFlashTrackRequest = z.infer<typeof submitFlashTrackRequestSchema>;
