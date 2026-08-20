import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PartyPlayback, PartySummary } from "@songfest/shared";

import { HostLiveScreen } from "./host-live-screen";

const party: PartySummary = {
  id: "11111111-1111-4111-8111-111111111111",
  code: "AA84K2",
  name: "Lucas' Place",
  status: "ACTIVE",
  activePlaylistId: "22222222-2222-4222-8222-222222222222",
  scheduledPlaylistId: null,
  stateVersion: 1,
  createdAt: "2026-08-20T18:00:00.000Z",
  location: "Paris",
  scheduledFor: null,
  activeParticipantCount: 12,
  selectedDeviceId: "device-1",
};

const playback: PartyPlayback = {
  currentTrack: {
    id: "33333333-3333-4333-8333-333333333333",
    playlistId: "22222222-2222-4222-8222-222222222222",
    spotifyTrackId: "spotify-id",
    spotifyUri: "spotify:track:spotify-id",
    spotifyUrl: "https://open.spotify.com/track/spotify-id",
    title: "Nights",
    artistNames: ["Frank Ocean"],
    spotifyArtistIds: ["artist-id"],
    coverUrl: null,
    durationMs: 307_000,
    isExplicit: false,
    proposedBy: null,
    voteCount: 24,
    status: "PLAYING",
    createdAt: "2026-08-20T18:00:00.000Z",
  },
  queuedTrack: null,
  activePlaylistId: "22222222-2222-4222-8222-222222222222",
  scheduledPlaylistId: null,
  progressMs: 138_000,
  durationMs: 307_000,
  isPlaying: false,
  skipVote: {
    voteCount: 0,
    requiredVotes: 7,
    participantHasVoted: false,
    isAvailable: true,
  },
  lastSyncedAt: "2026-08-20T18:02:18.000Z",
  serverTimestamp: 1_787_246_538_000,
};

describe("HostLiveScreen", () => {
  it("keeps music and the immediate playback controls at the center of host live", () => {
    const onTogglePlayback = vi.fn();
    const onSkip = vi.fn();

    render(
      <HostLiveScreen
        party={party}
        playback={playback}
        moodName="Groove"
        moodVisualKey="bass"
        currentVoteCount={24}
        upNext={[]}
        playbackPending={false}
        errorMessage={undefined}
        onStart={vi.fn()}
        onTogglePlayback={onTogglePlayback}
        onSkip={onSkip}
      />,
    );

    expect(screen.getByRole("heading", { name: "En cours" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nights" })).toBeInTheDocument();
    expect(screen.getByText("Groove")).toBeInTheDocument();
    expect(screen.getAllByText("12")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Reprendre la lecture" }));
    fireEvent.click(screen.getByRole("button", { name: "Passer au morceau suivant" }));

    expect(onTogglePlayback).toHaveBeenCalledOnce();
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
