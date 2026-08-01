import { describe, expect, it } from "vitest";

import {
  findTrackRejectionReason,
  type TrackEligibilityContext,
} from "../src/domain/track-eligibility.js";

const validContext: TrackEligibilityContext = {
  spotifyTrackId: "spotify-track",
  durationMs: 180_000,
  isExplicit: false,
  maxDurationMs: 480_000,
  explicitContentAllowed: false,
  playlistTracks: [],
  recentlyPlayedTracks: [],
  replayBlockDurationMs: 180 * 60_000,
  nowMs: 1_000_000_000,
};

describe("findTrackRejectionReason", () => {
  it("accepts an eligible track", () => {
    expect(findTrackRejectionReason(validContext)).toBeNull();
  });

  it("rejects a duplicate in the playlist", () => {
    expect(
      findTrackRejectionReason({
        ...validContext,
        playlistTracks: [{ spotifyTrackId: "spotify-track", isBannedForParty: false }],
      }),
    ).toBe("TRACK_ALREADY_EXISTS");
  });

  it("keeps a banned track blocked", () => {
    expect(
      findTrackRejectionReason({
        ...validContext,
        playlistTracks: [{ spotifyTrackId: "spotify-track", isBannedForParty: true }],
      }),
    ).toBe("TRACK_BANNED");
  });

  it("rejects tracks above the configured duration", () => {
    expect(
      findTrackRejectionReason({
        ...validContext,
        durationMs: 480_001,
      }),
    ).toBe("TRACK_TOO_LONG");
  });

  it("rejects explicit content when the playlist forbids it", () => {
    expect(
      findTrackRejectionReason({
        ...validContext,
        isExplicit: true,
      }),
    ).toBe("TRACK_EXPLICIT_NOT_ALLOWED");
  });

  it("rejects a recently played track inside the configured window", () => {
    expect(
      findTrackRejectionReason({
        ...validContext,
        recentlyPlayedTracks: [
          {
            spotifyTrackId: "spotify-track",
            playedAtMs: validContext.nowMs - 60_000,
          },
        ],
      }),
    ).toBe("TRACK_RECENTLY_PLAYED");
  });

  it("accepts the track once the replay block window has elapsed", () => {
    expect(
      findTrackRejectionReason({
        ...validContext,
        recentlyPlayedTracks: [
          {
            spotifyTrackId: "spotify-track",
            playedAtMs: validContext.nowMs - validContext.replayBlockDurationMs - 1,
          },
        ],
      }),
    ).toBeNull();
  });
});
