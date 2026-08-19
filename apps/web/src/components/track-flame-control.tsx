import { Check, Minus, Plus } from "@phosphor-icons/react";

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
  const hasVoted = track.participantFlameCount > 0;
  const cannotToggleVote = disabled || pending || track.participantFlameCount > 1;
  const pressSlots = Array.from({ length: flameBudget.maxPerTrack }, (_, index) => index);

  return (
    <div className={`track-flame-control${compact ? " compact" : ""}`}>
      <button
        type="button"
        className={`track-vote-action${hasVoted ? " voted" : ""}`}
        aria-pressed={hasVoted}
        disabled={cannotToggleVote}
        onClick={hasVoted ? onRemove : onAdd}
      >
        {hasVoted ? <Check aria-hidden="true" weight="bold" /> : <Plus aria-hidden="true" />}
        {hasVoted ? "Voted" : "Vote"}
      </button>
      <div className="track-press-control">
        <span className="track-press-label">Your press</span>
        <span
          className="track-press-dots"
          aria-label={`${track.participantFlameCount} press placés sur ${track.title}`}
        >
          {pressSlots.map((slot) => (
            <i key={slot} className={slot < track.participantFlameCount ? "used" : ""} />
          ))}
        </span>
        <button
          type="button"
          aria-label={`Retirer un PRESS de ${track.title}`}
          disabled={cannotRemove || track.participantFlameCount <= 1}
          onClick={onRemove}
        >
          <Minus aria-hidden="true" weight="bold" />
        </button>
        <button
          type="button"
          aria-label={`Ajouter un PRESS à ${track.title}`}
          disabled={cannotAdd || !hasVoted}
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
    <div className="flame-budget-summary" aria-label="Budget de PRESS">
      <div>
        <span>Your press</span>
        <strong>
          {budget.remaining} disponible{budget.remaining === 1 ? "" : "s"}
        </strong>
      </div>
      <b>
        {budget.remaining}/{budget.total}
      </b>
      <small>Maximum {budget.maxPerTrack} par morceau. Tu peux les déplacer.</small>
    </div>
  );
}
