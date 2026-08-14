import { describe, expect, it } from "vitest";

import { selectNextTrack, type SelectionCandidate } from "../src/domain/select-next-track.js";

const candidate = (
  id: string,
  overrides: Partial<SelectionCandidate> = {},
): SelectionCandidate => ({
  id,
  status: "PENDING",
  proposedByParticipantId: `participant-${id}`,
  spotifyArtistIds: [`artist-${id}`],
  voteCount: 0,
  voteSupporterCount: 0,
  priorityLevel: 0,
  createdAtMs: 1_000,
  ...overrides,
});

describe("selectNextTrack", () => {
  it("returns null without candidates", () => {
    expect(
      selectNextTrack({
        candidates: [],
        recentTracks: [],
        lockedNextTrackId: null,
      }),
    ).toBeNull();
  });

  it("always selects the locked DOUBLE_TRACK companion", () => {
    const selected = selectNextTrack({
      candidates: [candidate("popular", { voteCount: 20 }), candidate("locked")],
      recentTracks: [],
      lockedNextTrackId: "locked",
    });

    expect(selected).toMatchObject({
      track: { id: "locked" },
      reason: "DOUBLE_TRACK",
    });
  });

  it("selects a priority reward before regular votes", () => {
    const selected = selectNextTrack({
      candidates: [
        candidate("popular", { voteCount: 20 }),
        candidate("priority", { priorityLevel: 1 }),
      ],
      recentTracks: [],
      lockedNextTrackId: null,
    });

    expect(selected).toMatchObject({
      track: { id: "priority" },
      reason: "PRIORITY",
    });
  });

  it("selects the most voted candidate in the same priority tier", () => {
    const selected = selectNextTrack({
      candidates: [candidate("one", { voteCount: 3 }), candidate("two", { voteCount: 5 })],
      recentTracks: [],
      lockedNextTrackId: null,
    });

    expect(selected?.track.id).toBe("two");
  });

  it("favors broad support over concentrated flames", () => {
    const selected = selectNextTrack({
      candidates: [
        candidate("consensus", { voteCount: 3, voteSupporterCount: 3 }),
        candidate("solo", { voteCount: 3, voteSupporterCount: 1 }),
      ],
      recentTracks: [],
      lockedNextTrackId: null,
    });

    expect(selected?.track.id).toBe("consensus");
  });

  it("avoids the previous contributor when an equivalent candidate exists", () => {
    const selected = selectNextTrack({
      candidates: [
        candidate("same", { proposedByParticipantId: "participant-a" }),
        candidate("other", { proposedByParticipantId: "participant-b", createdAtMs: 2_000 }),
      ],
      recentTracks: [
        {
          proposedByParticipantId: "participant-a",
          spotifyArtistIds: ["old-artist"],
        },
      ],
      lockedNextTrackId: null,
    });

    expect(selected).toMatchObject({
      track: { id: "other" },
      reason: "FAIRNESS",
    });
  });

  it("avoids recently played artists when an equivalent candidate exists", () => {
    const selected = selectNextTrack({
      candidates: [
        candidate("same-artist", { spotifyArtistIds: ["artist-a"] }),
        candidate("fresh-artist", { spotifyArtistIds: ["artist-b"], createdAtMs: 2_000 }),
      ],
      recentTracks: [
        {
          proposedByParticipantId: "someone-else",
          spotifyArtistIds: ["artist-a"],
        },
      ],
      lockedNextTrackId: null,
    });

    expect(selected?.track.id).toBe("fresh-artist");
  });

  it("uses age and id as deterministic final tie breakers", () => {
    const selected = selectNextTrack({
      candidates: [
        candidate("new", { createdAtMs: 2_000 }),
        candidate("old-b", { createdAtMs: 1_000 }),
        candidate("old-a", { createdAtMs: 1_000 }),
      ],
      recentTracks: [],
      lockedNextTrackId: null,
    });

    expect(selected).toMatchObject({
      track: { id: "old-a" },
      reason: "OLDEST",
    });
  });
});
