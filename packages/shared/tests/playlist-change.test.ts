import { describe, expect, it } from "vitest";

import { evaluatePlaylistChange } from "../src/domain/playlist-change.js";

const unlockedContext = {
  activeParticipantCount: 10,
  votesForPlaylist: 4,
  minimumAbsoluteVotes: 4,
  minimumPercentage: 40,
  playlistActivatedAtMs: 0,
  lockDurationMs: 15 * 60_000,
  nowMs: 16 * 60_000,
  votesEnabled: true,
  lockedByAdmin: false,
} as const;

describe("evaluatePlaylistChange", () => {
  it("uses the highest value between absolute and percentage thresholds", () => {
    const decision = evaluatePlaylistChange({
      ...unlockedContext,
      activeParticipantCount: 13,
      votesForPlaylist: 6,
    });

    expect(decision.requiredVotes).toBe(6);
    expect(decision.accepted).toBe(true);
  });

  it("blocks the change while the temporal lock is active", () => {
    const decision = evaluatePlaylistChange({
      ...unlockedContext,
      nowMs: 14 * 60_000,
    });

    expect(decision).toMatchObject({
      accepted: false,
      reason: "TIME_LOCKED",
      remainingLockMs: 60_000,
    });
  });

  it("blocks the change when votes are disabled", () => {
    expect(
      evaluatePlaylistChange({
        ...unlockedContext,
        votesEnabled: false,
      }).reason,
    ).toBe("VOTES_DISABLED");
  });

  it("blocks the change when the administrator locks the current playlist", () => {
    expect(
      evaluatePlaylistChange({
        ...unlockedContext,
        lockedByAdmin: true,
      }).reason,
    ).toBe("LOCKED_BY_ADMIN");
  });

  it("requires enough votes", () => {
    expect(
      evaluatePlaylistChange({
        ...unlockedContext,
        votesForPlaylist: 3,
      }).reason,
    ).toBe("INSUFFICIENT_VOTES");
  });

  it("rounds the percentage threshold upward", () => {
    const decision = evaluatePlaylistChange({
      ...unlockedContext,
      activeParticipantCount: 11,
      votesForPlaylist: 4,
    });

    expect(decision.requiredVotes).toBe(5);
    expect(decision.accepted).toBe(false);
  });
});
