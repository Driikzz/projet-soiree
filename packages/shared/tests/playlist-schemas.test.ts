import { describe, expect, it } from "vitest";

import {
  createPlaylistRequestSchema,
  playlistChangeStateSchema,
  updatePlaylistRequestSchema,
} from "../src/schemas/playlists.js";

describe("playlist schemas", () => {
  it("applies the MVP defaults to a new playlist", () => {
    const playlist = createPlaylistRequestSchema.parse({
      name: "Apéro",
      visualKey: "sunset",
    });

    expect(playlist).toEqual({
      name: "Apéro",
      description: null,
      visualKey: "sunset",
      quotaPerParticipant: 5,
      isOpen: true,
      trackVotesEnabled: true,
      explicitContentAllowed: false,
    });
  });

  it("rejects quotas outside the supported range", () => {
    expect(
      createPlaylistRequestSchema.safeParse({
        name: "Rap",
        visualKey: "bass",
        quotaPerParticipant: 51,
      }).success,
    ).toBe(false);
  });

  it("requires at least one field in a playlist update", () => {
    expect(updatePlaylistRequestSchema.safeParse({}).success).toBe(false);
    expect(updatePlaylistRequestSchema.safeParse({ isOpen: false }).success).toBe(true);
  });

  it("validates the public playlist change state", () => {
    expect(
      playlistChangeStateSchema.safeParse({
        activeParticipantCount: 10,
        requiredVotes: 4,
        remainingLockMs: 60_000,
        votesEnabled: true,
        lockedByAdmin: false,
        scheduledPlaylistId: null,
      }).success,
    ).toBe(true);
  });
});
