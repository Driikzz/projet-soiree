export const TRACK_FLAME_BUDGET = 5;
export const MAX_FLAMES_PER_TRACK = 3;

export const calculateTrackPriorityPoints = (supporterCount: number, flameCount: number) =>
  Math.max(0, supporterCount) * 7 + Math.max(0, flameCount);

export const calculateTrackPriorityScore = (
  supporterCount: number,
  flameCount: number,
  activeParticipantCount: number,
) => {
  if (activeParticipantCount <= 0) {
    return 0;
  }

  const score =
    (calculateTrackPriorityPoints(supporterCount, flameCount) * 10) / activeParticipantCount;
  return Math.min(100, Math.round(score));
};
