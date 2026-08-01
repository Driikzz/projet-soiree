import { describe, expect, it } from "vitest";

import {
  didObservedTrackChange,
  selectPlaybackTargetPlaylist,
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

  it("prepares the next track during the last minute", () => {
    const context = {
      hasQueuedTrack: false,
      observedTrackId: "spotify-track",
      durationMs: 180_000,
      isPlaying: true,
    };

    expect(shouldPrepareNextTrack({ ...context, progressMs: 119_999 })).toBe(false);
    expect(shouldPrepareNextTrack({ ...context, progressMs: 120_000 })).toBe(true);
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

describe("playback playlist selection", () => {
  const playlists = [
    { id: "apero", createdAtMs: 1, pendingTrackCount: 0 },
    { id: "rap", createdAtMs: 2, pendingTrackCount: 2 },
    { id: "electro", createdAtMs: 3, pendingTrackCount: 1 },
  ];

  it("keeps a playable scheduled playlist as the first choice", () => {
    expect(
      selectPlaybackTargetPlaylist({
        activePlaylistId: "rap",
        scheduledPlaylistId: "electro",
        playlists,
      }),
    ).toBe("electro");
  });

  it("keeps playing every pending track from the active playlist", () => {
    expect(
      selectPlaybackTargetPlaylist({
        activePlaylistId: "rap",
        scheduledPlaylistId: null,
        playlists,
      }),
    ).toBe("rap");
  });

  it("ignores an empty scheduled playlist while the active playlist still has tracks", () => {
    expect(
      selectPlaybackTargetPlaylist({
        activePlaylistId: "rap",
        scheduledPlaylistId: "apero",
        playlists,
      }),
    ).toBe("rap");
  });

  it("moves cyclically to the next playlist containing a pending track", () => {
    expect(
      selectPlaybackTargetPlaylist({
        activePlaylistId: "electro",
        scheduledPlaylistId: null,
        playlists: playlists.map((playlist) =>
          playlist.id === "electro" ? { ...playlist, pendingTrackCount: 0 } : playlist,
        ),
      }),
    ).toBe("rap");
  });

  it("returns null only when the whole party queue is empty", () => {
    expect(
      selectPlaybackTargetPlaylist({
        activePlaylistId: "apero",
        scheduledPlaylistId: null,
        playlists: playlists.map((playlist) => ({ ...playlist, pendingTrackCount: 0 })),
      }),
    ).toBeNull();
  });
});
