export interface FlashParticipantCandidate {
  id: string;
}

export interface SelectFlashParticipantInput<T extends FlashParticipantCandidate> {
  eligibleParticipants: readonly T[];
  recentWinnerIds: readonly string[];
  randomValue: number;
}

export const selectFlashParticipant = <T extends FlashParticipantCandidate>({
  eligibleParticipants,
  recentWinnerIds,
  randomValue,
}: SelectFlashParticipantInput<T>): T | null => {
  if (eligibleParticipants.length === 0) {
    return null;
  }

  const recentIds = new Set(recentWinnerIds.slice(0, Math.max(eligibleParticipants.length - 1, 0)));
  const fairPool = eligibleParticipants.filter((participant) => !recentIds.has(participant.id));
  const pool = fairPool.length > 0 ? fairPool : eligibleParticipants;
  const safeRandomValue = Number.isFinite(randomValue)
    ? Math.min(Math.max(randomValue, 0), 0.999_999_999)
    : 0;
  const index = Math.floor(safeRandomValue * pool.length);

  return pool[index] ?? pool[0] ?? null;
};
