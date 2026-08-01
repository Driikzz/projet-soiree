import { ArrowFatUp, ArrowRight, MusicNotes } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import type { ParticipantPlaylistTrack } from "@songfest/shared";

import { FormError } from "./form-error";
import { addTrackVote, removeTrackVote } from "../lib/api/tracks";

interface ActiveTrackPreviewProps {
  partyId: string;
  playlistId: string;
  playlistName: string;
  tracks: ParticipantPlaylistTrack[];
  votesEnabled: boolean;
}

export function ActiveTrackPreview({
  partyId,
  playlistId,
  playlistName,
  tracks,
  votesEnabled,
}: ActiveTrackPreviewProps) {
  const queryClient = useQueryClient();
  const voteMutation = useMutation({
    mutationFn: (track: ParticipantPlaylistTrack) =>
      track.participantHasVoted ? removeTrackVote(track.id) : addTrackVote(track.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["playlist-tracks", playlistId] });
    },
  });
  const candidates = tracks
    .filter((track) => track.status === "PENDING")
    .sort(
      (left, right) =>
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
          <p className="eyebrow">À toi de voter</p>
          <h2 id="track-votes-title">Les prochains sons de {playlistName}</h2>
          <p>Les votes font remonter les morceaux tant qu’ils ne sont pas réservés.</p>
        </div>
        <Link className="text-link" to={`/party/${partyId}/playlists/${playlistId}`}>
          Tout voir
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      <FormError
        message={voteMutation.error instanceof Error ? voteMutation.error.message : undefined}
      />
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
              <button
                type="button"
                className={`track-vote-button compact-track-vote${
                  track.participantHasVoted ? " voted" : ""
                }`}
                aria-label={`${
                  track.participantHasVoted ? "Retirer le vote pour" : "Voter pour"
                } ${track.title}`}
                aria-pressed={track.participantHasVoted}
                disabled={!votesEnabled || voteMutation.isPending}
                onClick={() => voteMutation.mutate(track)}
              >
                <ArrowFatUp
                  aria-hidden="true"
                  weight={track.participantHasVoted ? "fill" : "bold"}
                />
                {track.voteCount}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
