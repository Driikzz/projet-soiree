export type TrackRejectionReason =
  | "TRACK_ALREADY_EXISTS"
  | "TRACK_RECENTLY_PLAYED"
  | "TRACK_TOO_LONG"
  | "TRACK_EXPLICIT_NOT_ALLOWED"
  | "TRACK_BANNED";

export interface ExistingTrack {
  spotifyTrackId: string;
  isBannedForParty: boolean;
}

export interface RecentlyPlayedTrackReference {
  spotifyTrackId: string;
  playedAtMs: number;
}

export interface TrackEligibilityContext {
  spotifyTrackId: string;
  durationMs: number;
  isExplicit: boolean;
  maxDurationMs: number;
  explicitContentAllowed: boolean;
  playlistTracks: readonly ExistingTrack[];
  recentlyPlayedTracks: readonly RecentlyPlayedTrackReference[];
  replayBlockDurationMs: number;
  nowMs: number;
}

export function findTrackRejectionReason(
  context: TrackEligibilityContext,
): TrackRejectionReason | null {
  const existingTrack = context.playlistTracks.find(
    (track) => track.spotifyTrackId === context.spotifyTrackId,
  );

  if (existingTrack?.isBannedForParty) {
    return "TRACK_BANNED";
  }

  if (existingTrack) {
    return "TRACK_ALREADY_EXISTS";
  }

  if (context.durationMs > context.maxDurationMs) {
    return "TRACK_TOO_LONG";
  }

  if (context.isExplicit && !context.explicitContentAllowed) {
    return "TRACK_EXPLICIT_NOT_ALLOWED";
  }

  const replayBlockStartsAt = context.nowMs - context.replayBlockDurationMs;
  const recentlyPlayed = context.recentlyPlayedTracks.some(
    (track) =>
      track.spotifyTrackId === context.spotifyTrackId && track.playedAtMs >= replayBlockStartsAt,
  );

  return recentlyPlayed ? "TRACK_RECENTLY_PLAYED" : null;
}
