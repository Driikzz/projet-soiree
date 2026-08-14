ALTER TABLE "PlaylistTrack"
ADD COLUMN "voteSupporterCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TrackVote"
ADD COLUMN "weight" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "TrackVote"
ADD CONSTRAINT "TrackVote_weight_check" CHECK ("weight" BETWEEN 1 AND 3);

UPDATE "PlaylistTrack" AS track
SET "voteSupporterCount" = (
  SELECT COUNT(*)::INTEGER
  FROM "TrackVote" AS vote
  WHERE vote."trackId" = track."id"
);
