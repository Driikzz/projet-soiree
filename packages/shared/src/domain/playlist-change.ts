export type PlaylistChangeBlockReason =
  "VOTES_DISABLED" | "LOCKED_BY_ADMIN" | "TIME_LOCKED" | "INSUFFICIENT_VOTES";

export interface PlaylistChangeContext {
  activeParticipantCount: number;
  votesForPlaylist: number;
  minimumAbsoluteVotes: number;
  minimumPercentage: number;
  playlistActivatedAtMs: number;
  lockDurationMs: number;
  nowMs: number;
  votesEnabled: boolean;
  lockedByAdmin: boolean;
}

export interface PlaylistChangeDecision {
  accepted: boolean;
  requiredVotes: number;
  remainingLockMs: number;
  reason: PlaylistChangeBlockReason | null;
}

export function evaluatePlaylistChange(context: PlaylistChangeContext): PlaylistChangeDecision {
  const percentageVotes = Math.ceil(
    context.activeParticipantCount * (context.minimumPercentage / 100),
  );
  const requiredVotes = Math.max(context.minimumAbsoluteVotes, percentageVotes);
  const remainingLockMs = Math.max(
    0,
    context.playlistActivatedAtMs + context.lockDurationMs - context.nowMs,
  );

  if (!context.votesEnabled) {
    return { accepted: false, requiredVotes, remainingLockMs, reason: "VOTES_DISABLED" };
  }

  if (context.lockedByAdmin) {
    return { accepted: false, requiredVotes, remainingLockMs, reason: "LOCKED_BY_ADMIN" };
  }

  if (remainingLockMs > 0) {
    return { accepted: false, requiredVotes, remainingLockMs, reason: "TIME_LOCKED" };
  }

  if (context.votesForPlaylist < requiredVotes) {
    return { accepted: false, requiredVotes, remainingLockMs, reason: "INSUFFICIENT_VOTES" };
  }

  return { accepted: true, requiredVotes, remainingLockMs, reason: null };
}
