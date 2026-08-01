import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const partyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
export const nicknameSchema = z.string().trim().min(2).max(30);

export const partyStatusSchema = z.enum(["DRAFT", "OPEN", "ACTIVE", "ENDED"]);
export const trackStatusSchema = z.enum([
  "PENDING",
  "SELECTED",
  "QUEUED",
  "PLAYING",
  "PLAYED",
  "SKIPPED",
  "REMOVED",
]);
export const rewardTypeSchema = z.enum([
  "EXTRA_TRACK",
  "PRIORITY_TRACK",
  "DOUBLE_TRACK",
  "CHOOSE_NEXT_PLAYLIST",
]);
export const rewardStatusSchema = z.enum(["AVAILABLE", "CONSUMED", "REVOKED"]);
export const flashTurnStatusSchema = z.enum([
  "ACTIVE",
  "SUBMITTED",
  "EXPIRED",
  "CANCELLED",
  "PLAYED",
]);

export type PartyStatus = z.infer<typeof partyStatusSchema>;
export type TrackStatus = z.infer<typeof trackStatusSchema>;
export type RewardType = z.infer<typeof rewardTypeSchema>;
export type RewardStatus = z.infer<typeof rewardStatusSchema>;
export type FlashTurnStatus = z.infer<typeof flashTurnStatusSchema>;
