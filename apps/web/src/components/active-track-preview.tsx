import { ArrowRight, MusicNotes } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import type { ParticipantPlaylistTrack, TrackFlameBudget } from "@songfest/shared";

import { FormError } from "./form-error";
import { FlameBudgetSummary } from "./track-flame-control";
import { RotationTrackCard } from "./rotation-track-card";
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
    .slice(0, 6);
  const sideA = candidates.slice(0, 3);
  const sideB = candidates.slice(3);

  return (
    <section
      className="active-track-preview rotation-preview"
      id="guest-track-votes"
      aria-labelledby="track-votes-title"
    >
      <div className="section-heading action-section-heading">
        <div>
          <p className="eyebrow">ROT/NEXT — {playlistName}</p>
          <h2 id="track-votes-title">Rotation</h2>
          <p>Vote pour soutenir un morceau. Utilise PRESS pour lui donner plus de poids.</p>
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
        <div className="rotation-sides">
          <div className="rotation-side">
            <p className="rotation-side-label">Side A / Up next</p>
            {sideA.map((track, index) => (
              <RotationTrackCard
                track={track}
                position={index + 1}
                flameBudget={flameBudget}
                compact
                disabled={!votesEnabled}
                pending={voteMutation.isPending}
                onAdd={() => voteMutation.mutate({ trackId: track.id, action: "add" })}
                onRemove={() => voteMutation.mutate({ trackId: track.id, action: "remove" })}
                key={track.id}
              />
            ))}
          </div>
          {sideB.length > 0 && (
            <div className="rotation-side side-b">
              <p className="rotation-side-label">Side B / In rotation</p>
              {sideB.map((track, index) => (
                <RotationTrackCard
                  track={track}
                  position={index + sideA.length + 1}
                  flameBudget={flameBudget}
                  compact
                  disabled={!votesEnabled}
                  pending={voteMutation.isPending}
                  onAdd={() => voteMutation.mutate({ trackId: track.id, action: "add" })}
                  onRemove={() => voteMutation.mutate({ trackId: track.id, action: "remove" })}
                  key={track.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
