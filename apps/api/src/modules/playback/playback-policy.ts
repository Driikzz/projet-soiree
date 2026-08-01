const QUEUE_LEAD_TIME_MS = 60_000;

interface QueuePreparationContext {
  hasQueuedTrack: boolean;
  observedTrackId: string | null;
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
}

export const didObservedTrackChange = (
  previousSpotifyTrackId: string | null,
  observedSpotifyTrackId: string | null,
) => previousSpotifyTrackId !== null && previousSpotifyTrackId !== observedSpotifyTrackId;

export const shouldPrepareNextTrack = (context: QueuePreparationContext) => {
  if (context.hasQueuedTrack) {
    return false;
  }
  if (context.observedTrackId === null) {
    return true;
  }
  if (!context.isPlaying || context.durationMs <= 0) {
    return false;
  }

  return context.durationMs - context.progressMs <= QUEUE_LEAD_TIME_MS;
};

export interface PlaybackPlaylistCandidate {
  id: string;
  createdAtMs: number;
  pendingTrackCount: number;
}

interface PlaybackPlaylistSelectionContext {
  activePlaylistId: string;
  scheduledPlaylistId: string | null;
  playlists: readonly PlaybackPlaylistCandidate[];
}

export const selectPlaybackTargetPlaylist = (
  context: PlaybackPlaylistSelectionContext,
): string | null => {
  const orderedPlaylists = [...context.playlists].sort(
    (left, right) => left.createdAtMs - right.createdAtMs || left.id.localeCompare(right.id),
  );
  const hasPendingTrack = (playlistId: string) =>
    orderedPlaylists.some(
      (playlist) => playlist.id === playlistId && playlist.pendingTrackCount > 0,
    );

  if (context.scheduledPlaylistId !== null && hasPendingTrack(context.scheduledPlaylistId)) {
    return context.scheduledPlaylistId;
  }
  if (hasPendingTrack(context.activePlaylistId)) {
    return context.activePlaylistId;
  }

  const activeIndex = orderedPlaylists.findIndex(
    (playlist) => playlist.id === context.activePlaylistId,
  );
  const cycleStart = activeIndex === -1 ? 0 : activeIndex + 1;
  const cyclicPlaylists = [
    ...orderedPlaylists.slice(cycleStart),
    ...orderedPlaylists.slice(0, cycleStart),
  ];

  return cyclicPlaylists.find((playlist) => playlist.pendingTrackCount > 0)?.id ?? null;
};
