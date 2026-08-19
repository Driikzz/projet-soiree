import { ArrowSquareOut, MusicNotes } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import type { ParticipantPlaylistTrack, PlaylistTrack, TrackFlameBudget } from "@songfest/shared";

import { TrackFlameControl } from "./track-flame-control";

interface RotationTrackCardProps {
  track: ParticipantPlaylistTrack | PlaylistTrack;
  position: number;
  flameBudget?: TrackFlameBudget;
  disabled?: boolean;
  pending?: boolean;
  moving?: boolean;
  compact?: boolean;
  label?: string;
  actions?: ReactNode;
  onAdd?: () => void;
  onRemove?: () => void;
}

const isParticipantTrack = (
  track: ParticipantPlaylistTrack | PlaylistTrack,
): track is ParticipantPlaylistTrack => "participantFlameCount" in track;

export function RotationTrackCard({
  track,
  position,
  flameBudget,
  disabled = false,
  pending = false,
  moving = false,
  compact = false,
  label,
  actions,
  onAdd,
  onRemove,
}: RotationTrackCardProps) {
  const stateClass = track.status === "PLAYING" ? " is-playing" : "";
  const participantTrack = isParticipantTrack(track) ? track : undefined;
  const votedClass = participantTrack?.participantHasVoted === true ? " is-voted" : "";

  return (
    <article
      className={`rotation-track-card${stateClass}${votedClass}${moving ? " is-moving" : ""}${compact ? " is-compact" : ""}`}
    >
      <span className="rotation-track-position">{String(position).padStart(2, "0")}</span>
      {track.coverUrl === null ? (
        <span className="rotation-track-cover cover-fallback" aria-hidden="true">
          <MusicNotes />
        </span>
      ) : (
        <img
          className="rotation-track-cover"
          src={track.coverUrl}
          alt={`Pochette de ${track.title}`}
          loading="lazy"
        />
      )}
      <div className="rotation-track-copy">
        {label !== undefined && <small>{label}</small>}
        <strong>{track.title}</strong>
        <span>{track.artistNames.join(", ")}</span>
        {!compact && <small>Proposé par {track.proposedBy?.nickname ?? "le host"}</small>}
      </div>
      <div className="rotation-track-social">
        {participantTrack === undefined ? (
          <span>
            <strong>{track.voteCount}</strong> PRESS
          </span>
        ) : (
          <>
            <span>
              <strong>{participantTrack.voteSupporterCount}</strong> vote
              {participantTrack.voteSupporterCount === 1 ? "" : "s"}
            </span>
            <span>
              <strong>{participantTrack.voteScore}</strong> impact
            </span>
          </>
        )}
      </div>
      {participantTrack !== undefined &&
        flameBudget !== undefined &&
        onAdd !== undefined &&
        onRemove !== undefined && (
          <TrackFlameControl
            track={participantTrack}
            flameBudget={flameBudget}
            compact={compact}
            disabled={disabled}
            pending={pending}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        )}
      {!compact && (
        <a
          className="rotation-track-external"
          href={track.spotifyUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Ouvrir ${track.title} dans Spotify`}
        >
          Spotify
          <ArrowSquareOut aria-hidden="true" />
        </a>
      )}
      {actions !== undefined && <div className="rotation-track-host-actions">{actions}</div>}
    </article>
  );
}
