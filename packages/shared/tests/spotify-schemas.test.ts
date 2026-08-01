import { describe, expect, it } from "vitest";

import {
  partyPlaybackSchema,
  spotifySearchQuerySchema,
  spotifySearchResponseSchema,
} from "../src/schemas/spotify.js";

describe("Spotify schemas", () => {
  it("normalizes a valid search query", () => {
    const query = spotifySearchQuerySchema.parse({
      partyId: "347e1a58-e279-4144-a90c-2a71be4ffab7",
      q: "  Daft Punk  ",
    });

    expect(query.q).toBe("Daft Punk");
  });

  it("rejects searches shorter than two characters", () => {
    expect(
      spotifySearchQuerySchema.safeParse({
        partyId: "347e1a58-e279-4144-a90c-2a71be4ffab7",
        q: "A",
      }).success,
    ).toBe(false);
  });

  it("rejects incomplete track snapshots at the shared boundary", () => {
    expect(
      spotifySearchResponseSchema.safeParse({
        tracks: [
          {
            spotifyTrackId: "track-id",
            title: "Around the World",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects a playback state with an invalid progress", () => {
    expect(
      partyPlaybackSchema.safeParse({
        currentTrack: null,
        queuedTrack: null,
        activePlaylistId: null,
        scheduledPlaylistId: null,
        progressMs: -1,
        durationMs: 0,
        isPlaying: false,
        lastSyncedAt: null,
        serverTimestamp: Date.now(),
      }).success,
    ).toBe(false);
  });
});
