import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ParticipantPlaylistTrack, TrackFlameBudget } from "@songfest/shared";

import { TrackFlameControl } from "./track-flame-control";

const track: ParticipantPlaylistTrack = {
  id: "dff44091-e434-4fee-8cd7-3d6eb47aa915",
  playlistId: "4b84ae73-a07f-4ed1-b15f-10b807972c62",
  spotifyTrackId: "track-id",
  spotifyUri: "spotify:track:track-id",
  spotifyUrl: "https://open.spotify.com/track/track-id",
  title: "Around the World",
  artistNames: ["Daft Punk"],
  spotifyArtistIds: ["artist-id"],
  coverUrl: null,
  durationMs: 429_533,
  isExplicit: false,
  proposedBy: null,
  voteCount: 4,
  voteSupporterCount: 3,
  voteScore: 63,
  participantHasVoted: true,
  participantFlameCount: 2,
  status: "PENDING",
  createdAt: "2026-08-14T20:00:00.000Z",
};

const budget: TrackFlameBudget = {
  total: 5,
  used: 4,
  remaining: 1,
  maxPerTrack: 3,
};

describe("TrackFlameControl", () => {
  it("shows priority and lets the participant move flames", async () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    const user = userEvent.setup();

    render(
      <TrackFlameControl track={track} flameBudget={budget} onAdd={onAdd} onRemove={onRemove} />,
    );

    expect(
      screen.getByRole("progressbar", { name: "Priorité de Around the World" }),
    ).toHaveAttribute("aria-valuenow", "63");
    await user.click(screen.getByRole("button", { name: "Ajouter une flamme à Around the World" }));
    await user.click(
      screen.getByRole("button", { name: "Retirer une flamme de Around the World" }),
    );

    expect(onAdd).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("blocks additions when the personal budget is empty", () => {
    render(
      <TrackFlameControl
        track={track}
        flameBudget={{ ...budget, remaining: 0 }}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Ajouter une flamme à Around the World" }),
    ).toBeDisabled();
  });
});
