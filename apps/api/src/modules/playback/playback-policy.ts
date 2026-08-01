const QUEUE_LEAD_TIME_MS = 30_000;

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
