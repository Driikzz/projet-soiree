import { describe, expect, it } from "vitest";

import {
  didObservedTrackChange,
  shouldPrepareNextTrack,
} from "../src/modules/playback/playback-policy.js";

describe("playback policy", () => {
  it("does not treat the first Spotify observation as a completed track", () => {
    expect(didObservedTrackChange(null, "spotify-track")).toBe(false);
  });

  it("detects a track change and the end of playback", () => {
    expect(didObservedTrackChange("first", "second")).toBe(true);
    expect(didObservedTrackChange("first", null)).toBe(true);
    expect(didObservedTrackChange("first", "first")).toBe(false);
  });

  it("starts immediately when Spotify has no current track", () => {
    expect(
      shouldPrepareNextTrack({
        hasQueuedTrack: false,
        observedTrackId: null,
        progressMs: 0,
        durationMs: 0,
        isPlaying: false,
      }),
    ).toBe(true);
  });

  it("waits until the last thirty seconds before filling the Spotify queue", () => {
    const context = {
      hasQueuedTrack: false,
      observedTrackId: "spotify-track",
      durationMs: 180_000,
      isPlaying: true,
    };

    expect(shouldPrepareNextTrack({ ...context, progressMs: 149_999 })).toBe(false);
    expect(shouldPrepareNextTrack({ ...context, progressMs: 150_000 })).toBe(true);
  });

  it("never prepares a second track while one is already reserved", () => {
    expect(
      shouldPrepareNextTrack({
        hasQueuedTrack: true,
        observedTrackId: null,
        progressMs: 0,
        durationMs: 0,
        isPlaying: false,
      }),
    ).toBe(false);
  });
});
