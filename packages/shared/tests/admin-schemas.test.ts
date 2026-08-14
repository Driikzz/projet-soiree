import { describe, expect, it } from "vitest";

import {
  assignRewardRequestSchema,
  updatePartySettingsRequestSchema,
  useRewardRequestSchema,
} from "../src/index.js";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("admin and reward schemas", () => {
  it("requires at least one setting and rejects unsupported settings", () => {
    expect(updatePartySettingsRequestSchema.safeParse({}).success).toBe(false);
    expect(
      updatePartySettingsRequestSchema.safeParse({
        playlistVotesEnabled: false,
      }).success,
    ).toBe(true);
    expect(
      updatePartySettingsRequestSchema.safeParse({
        playlistVotesEnabled: false,
        spotifyAccessToken: "secret",
      }).success,
    ).toBe(false);
  });

  it("keeps playlist vote thresholds within their supported ranges", () => {
    expect(
      updatePartySettingsRequestSchema.safeParse({
        minimumPlaylistVotePercentage: 40,
        playlistLockMinutes: 15,
      }).success,
    ).toBe(true);
    expect(
      updatePartySettingsRequestSchema.safeParse({
        minimumPlaylistVotePercentage: 101,
      }).success,
    ).toBe(false);
  });

  it("keeps the participant flame budget within its supported range", () => {
    expect(
      updatePartySettingsRequestSchema.safeParse({
        flameBudgetPerParticipant: 5,
      }).success,
    ).toBe(true);
    expect(
      updatePartySettingsRequestSchema.safeParse({
        flameBudgetPerParticipant: 0,
      }).success,
    ).toBe(false);
    expect(
      updatePartySettingsRequestSchema.safeParse({
        flameBudgetPerParticipant: 51,
      }).success,
    ).toBe(false);
  });

  it("limits reward grants to known types and ten uses", () => {
    expect(
      assignRewardRequestSchema.safeParse({
        partyId: uuid,
        participantId: uuid,
        type: "DOUBLE_TRACK",
        uses: 1,
      }).success,
    ).toBe(true);
    expect(
      assignRewardRequestSchema.safeParse({
        partyId: uuid,
        participantId: uuid,
        type: "UNLIMITED_TRACKS",
        uses: 100,
      }).success,
    ).toBe(false);
  });

  it("accepts at most two track targets for a reward use", () => {
    expect(
      useRewardRequestSchema.safeParse({
        rewardId: uuid,
        trackIds: [uuid, "39c52350-459d-4c6a-a662-4efc62734c1b"],
      }).success,
    ).toBe(true);
    expect(
      useRewardRequestSchema.safeParse({
        rewardId: uuid,
        trackIds: [
          uuid,
          "39c52350-459d-4c6a-a662-4efc62734c1b",
          "82357111-44f7-4d8f-908f-652baf2e71b4",
        ],
      }).success,
    ).toBe(false);
  });
});
