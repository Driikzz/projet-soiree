import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { PartyPlayback } from "@songfest/shared";

import { NowPlayingCard } from "./now-playing-card";

const playback: PartyPlayback = {
  currentTrack: {
    id: "347e1a58-e279-4144-a90c-2a71be4ffab7",
    playlistId: "95ec6a2c-f23b-4228-a23c-b09498ecaab1",
    spotifyTrackId: "spotify-track",
    spotifyUri: "spotify:track:spotify-track",
    spotifyUrl: "https://open.spotify.com/track/spotify-track",
    title: "One More Time",
    artistNames: ["Daft Punk"],
    spotifyArtistIds: ["artist-id"],
    coverUrl: null,
    durationMs: 320_000,
    isExplicit: false,
    proposedBy: {
      id: "1163ea37-63ee-4fc8-8256-e55dca00cd9f",
      nickname: "Camille",
      avatarSeed: "camille",
    },
    voteCount: 8,
    status: "PLAYING",
    createdAt: "2026-07-27T20:00:00.000Z",
  },
  queuedTrack: null,
  activePlaylistId: "95ec6a2c-f23b-4228-a23c-b09498ecaab1",
  scheduledPlaylistId: null,
  progressMs: 60_000,
  durationMs: 320_000,
  isPlaying: false,
  skipVote: {
    voteCount: 2,
    requiredVotes: 4,
    participantHasVoted: false,
    isAvailable: true,
  },
  lastSyncedAt: "2026-07-27T20:01:00.000Z",
  serverTimestamp: 1_785_180_060_000,
};

describe("NowPlayingCard", () => {
  it("shows the current track, contributor and an accessible progression", () => {
    render(<NowPlayingCard playback={playback} />);

    expect(screen.getByRole("heading", { name: "One More Time" })).toBeInTheDocument();
    expect(screen.getByText("Daft Punk")).toBeInTheDocument();
    expect(screen.getByText("Proposé par Camille")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60000");
  });

  it("announces the reserved track before playback starts", () => {
    render(
      <NowPlayingCard
        playback={{
          ...playback,
          currentTrack: null,
          queuedTrack: playback.currentTrack,
          progressMs: 0,
          durationMs: 0,
        }}
      />,
    );

    expect(screen.getByText("One More Time est prêt à démarrer.")).toBeInTheDocument();
  });

  it("shows a clear collective skip vote for participants", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <NowPlayingCard playback={playback} partyId="party-id" />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("button", { name: /Voter pour passer/ })).toBeVisible();
    expect(screen.getByText("2 votes encore pour le passer.")).toBeVisible();
    expect(screen.getByText("2/4")).toBeVisible();
  });
});
