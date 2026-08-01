import { z } from "zod";

import { rewardStatusSchema, rewardTypeSchema, uuidSchema } from "./common.js";

export const assignRewardRequestSchema = z.object({
  partyId: uuidSchema,
  participantId: uuidSchema,
  type: rewardTypeSchema,
  uses: z.number().int().min(1).max(10).default(1),
});

export const useRewardRequestSchema = z.object({
  rewardId: uuidSchema,
  trackIds: z.array(uuidSchema).min(1).max(2).optional(),
  playlistId: uuidSchema.optional(),
});

export const rewardSchema = z.object({
  id: uuidSchema,
  partyId: uuidSchema,
  participantId: uuidSchema,
  type: rewardTypeSchema,
  status: rewardStatusSchema,
  usesGranted: z.number().int().positive(),
  usesRemaining: z.number().int().nonnegative(),
  assignedAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
});

export type AssignRewardRequest = z.infer<typeof assignRewardRequestSchema>;
export type UseRewardRequest = z.infer<typeof useRewardRequestSchema>;
export type Reward = z.infer<typeof rewardSchema>;
