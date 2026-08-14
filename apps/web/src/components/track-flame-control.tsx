import { Fire, Minus, Plus } from "@phosphor-icons/react";

import type { ParticipantPlaylistTrack, TrackFlameBudget } from "@songfest/shared";

interface TrackFlameControlProps {
  track: ParticipantPlaylistTrack;
  flameBudget: TrackFlameBudget;
  disabled?: boolean;
  pending?: boolean;
  compact?: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

export function TrackFlameControl({
  track,
  flameBudget,
  disabled = false,
  pending = false,
  compact = false,
  onAdd,
  onRemove,
}: TrackFlameControlProps) {
  const cannotAdd =
    disabled ||
    pending ||
    flameBudget.remaining === 0 ||
    track.participantFlameCount >= flameBudget.maxPerTrack;
  const cannotRemove = disabled || pending || track.participantFlameCount === 0;

  return (
    <div className={`track-flame-control${compact ? " compact" : ""}`}>
      <div className="track-priority-label">
        <span>Priorité</span>
        <strong>{track.voteScore}</strong>
      </div>
      <div
        className="track-priority-gauge"
        role="progressbar"
        aria-label={`Priorité de ${track.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={track.voteScore}
      >
        <span style={{ width: `${track.voteScore}%` }} />
      </div>
      {!compact && (
        <small>
          {track.voteCount} flamme{track.voteCount === 1 ? "" : "s"} · {track.voteSupporterCount}{" "}
          soutien{track.voteSupporterCount === 1 ? "" : "s"}
        </small>
      )}
      <div className="track-flame-actions">
        <button
          type="button"
          aria-label={`Retirer une flamme de ${track.title}`}
          disabled={cannotRemove}
          onClick={onRemove}
        >
          <Minus aria-hidden="true" weight="bold" />
        </button>
        <span aria-label={`${track.participantFlameCount} flammes placées sur ${track.title}`}>
          <Fire aria-hidden="true" weight={track.participantFlameCount > 0 ? "fill" : "bold"} />
          {track.participantFlameCount}/{flameBudget.maxPerTrack}
        </span>
        <button
          type="button"
          aria-label={`Ajouter une flamme à ${track.title}`}
          disabled={cannotAdd}
          onClick={onAdd}
        >
          <Plus aria-hidden="true" weight="bold" />
        </button>
      </div>
    </div>
  );
}

export function FlameBudgetSummary({ budget }: { budget: TrackFlameBudget }) {
  return (
    <div className="flame-budget-summary" aria-label="Budget de flammes">
      <Fire aria-hidden="true" weight="fill" />
      <div>
        <strong>
          {budget.remaining} flamme{budget.remaining === 1 ? "" : "s"} à distribuer
        </strong>
        <span>Maximum {budget.maxPerTrack} par morceau, déplaçables à tout moment.</span>
      </div>
      <b>
        {budget.remaining}/{budget.total}
      </b>
    </div>
  );
}
