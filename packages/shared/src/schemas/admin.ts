import { z } from "zod";

import { partySettingsSchema } from "./parties.js";
import { playlistTrackSchema } from "./tracks.js";
import { rewardSchema } from "./rewards.js";
import { uuidSchema } from "./common.js";
import { flashStateSchema } from "./flash.js";

export const updatePartySettingsRequestSchema = partySettingsSchema
  .omit({ nextFlashTurnAt: true })
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, "Au moins une modification est requise.");

export const adminParticipantSchema = z.object({
  id: uuidSchema,
  nickname: z.string(),
  avatarSeed: z.string(),
  isActive: z.boolean(),
  isBlocked: z.boolean(),
  joinedAt: z.string().datetime(),
  contributionCount: z.number().int().nonnegative(),
  rewards: z.array(rewardSchema),
});

export const adminDashboardTrackSchema = playlistTrackSchema.extend({
  playlistName: z.string(),
});

export const adminDashboardSchema = z.object({
  participants: z.array(adminParticipantSchema),
  recentTracks: z.array(adminDashboardTrackSchema),
  settings: partySettingsSchema,
  nextTrackId: uuidSchema.nullable(),
  flash: flashStateSchema,
});

export const removeTrackRequestSchema = z
  .object({
    reason: z.string().trim().max(300).optional(),
  })
  .strict();

export type UpdatePartySettingsRequest = z.infer<typeof updatePartySettingsRequestSchema>;
export type AdminParticipant = z.infer<typeof adminParticipantSchema>;
export type AdminDashboardTrack = z.infer<typeof adminDashboardTrackSchema>;
export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
export type RemoveTrackRequest = z.infer<typeof removeTrackRequestSchema>;
