import { describe, expect, it } from "vitest";

import {
  addTrackRequestSchema,
  participantTrackQuotaSchema,
  participantPlaylistTrackSchema,
  playlistTrackSchema,
  trackVoteResultSchema,
} from "../src/schemas/tracks.js";

describe("track schemas", () => {
  it("accepts only the Spotify identifier at the add boundary", () => {
    expect(addTrackRequestSchema.parse({ spotifyTrackId: "11dFghVXANMlKmJXsNCbNl" })).toEqual({
      spotifyTrackId: "11dFghVXANMlKmJXsNCbNl",
    });
    expect(addTrackRequestSchema.safeParse({ spotifyTrackId: "" }).success).toBe(false);
  });

  it("validates a complete persisted track response", () => {
    expect(
      playlistTrackSchema.safeParse({
        id: "dff44091-e434-4fee-8cd7-3d6eb47aa915",
        playlistId: "4b84ae73-a07f-4ed1-b15f-10b807972c62",
        spotifyTrackId: "11dFghVXANMlKmJXsNCbNl",
        spotifyUri: "spotify:track:11dFghVXANMlKmJXsNCbNl",
        spotifyUrl: "https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl",
        title: "Around the World",
        artistNames: ["Daft Punk"],
        spotifyArtistIds: ["4tZwfgrHOc3mvqYlEYSvVi"],
        coverUrl: null,
        durationMs: 429_533,
        isExplicit: false,
        proposedBy: {
          id: "376c52b1-d45d-4f40-87a8-c0c05bfdf0bb",
          nickname: "Camille",
          avatarSeed: "camille",
        },
        voteCount: 0,
        status: "PENDING",
        createdAt: "2026-07-27T00:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects an inconsistent quota response", () => {
    expect(
      participantTrackQuotaSchema.safeParse({
        baseQuota: 5,
        extraTrackUses: -1,
        used: 6,
        remaining: 0,
      }).success,
    ).toBe(false);
  });

  it("requires the participant vote state in an invited track response", () => {
    const baseTrack = {
      id: "dff44091-e434-4fee-8cd7-3d6eb47aa915",
      playlistId: "4b84ae73-a07f-4ed1-b15f-10b807972c62",
      spotifyTrackId: "11dFghVXANMlKmJXsNCbNl",
      spotifyUri: "spotify:track:11dFghVXANMlKmJXsNCbNl",
      spotifyUrl: "https://open.spotify.com/track/11dFghVXANMlKmJXsNCbNl",
      title: "Around the World",
      artistNames: ["Daft Punk"],
      spotifyArtistIds: ["4tZwfgrHOc3mvqYlEYSvVi"],
      coverUrl: null,
      durationMs: 429_533,
      isExplicit: false,
      proposedBy: null,
      voteCount: 1,
      status: "PENDING",
      createdAt: "2026-07-27T00:00:00.000Z",
    };

    expect(participantPlaylistTrackSchema.safeParse(baseTrack).success).toBe(false);
    expect(
      participantPlaylistTrackSchema.safeParse({
        ...baseTrack,
        participantHasVoted: true,
      }).success,
    ).toBe(true);
    expect(
      trackVoteResultSchema.safeParse({
        trackId: baseTrack.id,
        voteCount: 1,
        participantHasVoted: true,
      }).success,
    ).toBe(true);
  });
});
