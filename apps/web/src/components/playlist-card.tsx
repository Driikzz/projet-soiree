import { ArrowFatUp, ArrowRight, LockKey, MusicNotes, UsersThree } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

import type { PlaylistSummary } from "@songfest/shared";

import { PlaylistVisual } from "./playlist-visual";

interface PlaylistCardProps {
  playlist: PlaylistSummary;
  partyId: string;
  requiredVotes?: number;
  canVote?: boolean;
  votePending?: boolean;
  onVote?: () => void;
}

export function PlaylistCard({
  playlist,
  partyId,
  requiredVotes,
  canVote = false,
  votePending = false,
  onVote,
}: PlaylistCardProps) {
  const status = playlist.isActive
    ? "En cours"
    : playlist.isScheduled
      ? "Prend le relais ensuite"
      : playlist.isOpen
        ? "Disponible"
        : "Verrouillée";

  return (
    <article className={`playlist-card${playlist.isActive ? " active-playlist-card" : ""}`}>
      <Link className="playlist-card-link" to={`/party/${partyId}/playlists/${playlist.id}`}>
        <PlaylistVisual visualKey={playlist.visualKey} label={playlist.name} />
        <div className="playlist-card-body">
          <div className="playlist-card-heading">
            <h2>{playlist.name}</h2>
            <span className="playlist-state">
              {!playlist.isOpen && !playlist.isActive && (
                <LockKey aria-hidden="true" weight="fill" />
              )}
              {status}
            </span>
          </div>
          <p>{playlist.description ?? "Une ambiance à construire ensemble."}</p>
          <div className="playlist-card-stats">
            <span>
              <MusicNotes aria-hidden="true" />
              {playlist.trackCount} morceau{playlist.trackCount === 1 ? "" : "x"}
            </span>
            <span>
              <UsersThree aria-hidden="true" />
              {playlist.contributorCount} contributeur
              {playlist.contributorCount > 1 ? "s" : ""}
            </span>
          </div>
          <span className="playlist-open-label">
            Ouvrir et proposer
            <ArrowRight aria-hidden="true" />
          </span>
        </div>
      </Link>
      {!playlist.isActive && (
        <div className="playlist-vote-zone">
          <span>
            {playlist.playlistVoteCount}
            {requiredVotes === undefined ? "" : ` / ${requiredVotes}`} vote
            {playlist.playlistVoteCount === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            className={`playlist-vote-button${
              playlist.participantHasVoted === true ? " voted" : ""
            }`}
            aria-pressed={playlist.participantHasVoted === true}
            disabled={!canVote || votePending || onVote === undefined}
            onClick={onVote}
          >
            <ArrowFatUp
              aria-hidden="true"
              weight={playlist.participantHasVoted === true ? "fill" : "bold"}
            />
            {playlist.participantHasVoted === true
              ? "Vote d’ambiance ajouté"
              : "Voter pour cette ambiance"}
          </button>
        </div>
      )}
    </article>
  );
}
