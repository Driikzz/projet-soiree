import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { PlaylistSummary } from "@songfest/shared";

import { PlaylistCard } from "./playlist-card";

const playlist: PlaylistSummary = {
  id: "95ec6a2c-f23b-4228-a23c-b09498ecaab1",
  partyId: "1163ea37-63ee-4fc8-8256-e55dca00cd9f",
  name: "Années 2000",
  description: "Les refrains que tout le monde connaît.",
  visualKey: "pixel",
  quotaPerParticipant: 5,
  isOpen: false,
  trackVotesEnabled: true,
  explicitContentAllowed: false,
  isActive: false,
  isScheduled: false,
  trackCount: 4,
  contributorCount: 3,
  playlistVoteCount: 2,
  participantTrackCount: 1,
  remainingTrackQuota: 4,
  activatedAt: null,
  createdAt: "2026-07-26T20:00:00.000Z",
};

describe("PlaylistCard", () => {
  it("communicates a locked state with text and a navigable target", () => {
    render(
      <MemoryRouter>
        <PlaylistCard playlist={playlist} partyId={playlist.partyId} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Années 2000/ })).toHaveAttribute(
      "href",
      `/party/${playlist.partyId}/playlists/${playlist.id}`,
    );
    expect(screen.getByText("Verrouillée")).toBeInTheDocument();
    expect(screen.getByText("4 morceaux")).toBeInTheDocument();
    expect(screen.getByText("3 contributeurs")).toBeInTheDocument();
  });

  it("exposes the playlist vote as a distinct accessible action", async () => {
    const onVote = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PlaylistCard
          playlist={{
            ...playlist,
            isOpen: true,
            participantHasVoted: false,
            playlistVoteCount: 3,
          }}
          partyId={playlist.partyId}
          requiredVotes={4}
          canVote
          onVote={onVote}
        />
      </MemoryRouter>,
    );

    const voteButton = screen.getByRole("button", { name: "Voter pour cette ambiance" });
    expect(voteButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("3 / 4 votes")).toBeInTheDocument();

    await user.click(voteButton);
    expect(onVote).toHaveBeenCalledOnce();
  });
});
