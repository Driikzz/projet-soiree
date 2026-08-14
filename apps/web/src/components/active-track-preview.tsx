import { ArrowRight, MusicNotes } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import type { ParticipantPlaylistTrack, TrackFlameBudget } from "@songfest/shared";

import { FormError } from "./form-error";
import { FlameBudgetSummary, TrackFlameControl } from "./track-flame-control";
import { addTrackVote, removeTrackVote } from "../lib/api/tracks";

interface ActiveTrackPreviewProps {
  partyId: string;
  playlistId: string;
  playlistName: string;
  tracks: ParticipantPlaylistTrack[];
  flameBudget: TrackFlameBudget;
  votesEnabled: boolean;
}

export function ActiveTrackPreview({
  partyId,
  playlistId,
  playlistName,
  tracks,
  flameBudget,
  votesEnabled,
}: ActiveTrackPreviewProps) {
  const queryClient = useQueryClient();
  const voteMutation = useMutation({
    mutationFn: ({ trackId, action }: { trackId: string; action: "add" | "remove" }) =>
      action === "add" ? addTrackVote(trackId) : removeTrackVote(trackId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["playlist-tracks", playlistId] });
    },
  });
  const candidates = tracks
    .filter((track) => track.status === "PENDING")
    .sort(
      (left, right) =>
        right.voteScore - left.voteScore ||
        right.voteSupporterCount - left.voteSupporterCount ||
        right.voteCount - left.voteCount ||
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    )
    .slice(0, 4);

  return (
    <section
      className="active-track-preview"
      id="guest-track-votes"
      aria-labelledby="track-votes-title"
    >
      <div className="section-heading action-section-heading">
        <div>
          <p className="eyebrow">À toi de distribuer</p>
          <h2 id="track-votes-title">Les prochains sons de {playlistName}</h2>
          <p>Place tes flammes sur les morceaux que tu veux vraiment entendre.</p>
        </div>
        <Link className="text-link" to={`/party/${partyId}/playlists/${playlistId}`}>
          Tout voir
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      <FormError
        message={voteMutation.error instanceof Error ? voteMutation.error.message : undefined}
      />
      {votesEnabled && <FlameBudgetSummary budget={flameBudget} />}
      {candidates.length === 0 ? (
        <div className="guest-action-empty">
          <MusicNotes aria-hidden="true" />
          <div>
            <strong>Pas encore de candidat</strong>
            <p>Propose le premier morceau de cette ambiance.</p>
          </div>
        </div>
      ) : (
        <div className="active-track-list">
          {candidates.map((track) => (
            <article key={track.id} className="active-track-row">
              {track.coverUrl === null ? (
                <span className="active-track-cover cover-fallback" aria-hidden="true">
                  <MusicNotes />
                </span>
              ) : (
                <img
                  className="active-track-cover"
                  src={track.coverUrl}
                  alt={`Pochette de ${track.title}`}
                  loading="lazy"
                />
              )}
              <div className="active-track-copy">
                <strong>{track.title}</strong>
                <span>{track.artistNames.join(", ")}</span>
              </div>
              <TrackFlameControl
                track={track}
                flameBudget={flameBudget}
                compact
                disabled={!votesEnabled}
                pending={voteMutation.isPending}
                onAdd={() => voteMutation.mutate({ trackId: track.id, action: "add" })}
                onRemove={() => voteMutation.mutate({ trackId: track.id, action: "remove" })}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
