ALTER TABLE "PlaybackState"
ADD COLUMN "lastPlaybackActivityAt" TIMESTAMP(3);

UPDATE "PlaybackState" AS playback
SET "lastPlaybackActivityAt" = COALESCE(
  (
    SELECT MAX(COALESCE(track."playedAt", track."playingAt"))
    FROM "PlaylistTrack" AS track
    INNER JOIN "PartyPlaylist" AS playlist ON playlist."id" = track."playlistId"
    WHERE playlist."partyId" = playback."partyId"
  ),
  party."startedAt"
)
FROM "Party" AS party
WHERE party."id" = playback."partyId"
  AND party."status" = 'ACTIVE';

CREATE INDEX "PlaybackState_lastPlaybackActivityAt_idx"
ON "PlaybackState" ("lastPlaybackActivityAt");
