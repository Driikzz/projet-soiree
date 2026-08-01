export interface SelectionCandidate {
  id: string;
  status: "PENDING";
  proposedByParticipantId: string | null;
  spotifyArtistIds: readonly string[];
  voteCount: number;
  priorityLevel: number;
  createdAtMs: number;
}

export interface RecentlyPlayedTrack {
  proposedByParticipantId: string | null;
  spotifyArtistIds: readonly string[];
}

export interface NextTrackContext {
  candidates: readonly SelectionCandidate[];
  recentTracks: readonly RecentlyPlayedTrack[];
  lockedNextTrackId: string | null;
  artistHistorySize?: number;
}

export type SelectionReason = "DOUBLE_TRACK" | "PRIORITY" | "VOTES" | "FAIRNESS" | "OLDEST";

export interface SelectedTrack {
  track: SelectionCandidate;
  reason: SelectionReason;
}

const oldestFirst = (left: SelectionCandidate, right: SelectionCandidate) =>
  left.createdAtMs - right.createdAtMs || left.id.localeCompare(right.id);

export function selectNextTrack(context: NextTrackContext): SelectedTrack | null {
  if (context.lockedNextTrackId) {
    const lockedTrack = context.candidates.find(
      (candidate) => candidate.id === context.lockedNextTrackId,
    );

    if (lockedTrack) {
      return { track: lockedTrack, reason: "DOUBLE_TRACK" };
    }
  }

  if (context.candidates.length === 0) {
    return null;
  }

  const highestPriority = Math.max(...context.candidates.map((track) => track.priorityLevel));
  let pool = context.candidates.filter((track) => track.priorityLevel === highestPriority);

  const highestVoteCount = Math.max(...pool.map((track) => track.voteCount));
  pool = pool.filter((track) => track.voteCount === highestVoteCount);

  let fairnessApplied = false;
  const lastContributorId = context.recentTracks[0]?.proposedByParticipantId;

  if (
    lastContributorId &&
    pool.some((track) => track.proposedByParticipantId !== lastContributorId)
  ) {
    pool = pool.filter((track) => track.proposedByParticipantId !== lastContributorId);
    fairnessApplied = true;
  }

  const artistHistorySize = context.artistHistorySize ?? 3;
  const recentArtistIds = new Set(
    context.recentTracks
      .slice(0, artistHistorySize)
      .flatMap((track) => [...track.spotifyArtistIds]),
  );
  const avoidsRecentArtist = (track: SelectionCandidate) =>
    track.spotifyArtistIds.every((artistId) => !recentArtistIds.has(artistId));
  const containsRecentArtist = (track: SelectionCandidate) => !avoidsRecentArtist(track);

  if (
    recentArtistIds.size > 0 &&
    pool.some(avoidsRecentArtist) &&
    pool.some(containsRecentArtist)
  ) {
    pool = pool.filter(avoidsRecentArtist);
    fairnessApplied = true;
  }

  const track = [...pool].sort(oldestFirst)[0];

  if (!track) {
    return null;
  }

  const reason: SelectionReason =
    highestPriority > 0
      ? "PRIORITY"
      : highestVoteCount > 0
        ? "VOTES"
        : fairnessApplied
          ? "FAIRNESS"
          : "OLDEST";

  return { track, reason };
}
