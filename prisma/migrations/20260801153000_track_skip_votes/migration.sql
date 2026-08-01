CREATE TABLE "TrackSkipVote" (
    "id" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackSkipVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrackSkipVote_trackId_participantId_key"
ON "TrackSkipVote"("trackId", "participantId");

CREATE INDEX "TrackSkipVote_partyId_trackId_idx"
ON "TrackSkipVote"("partyId", "trackId");

CREATE INDEX "TrackSkipVote_participantId_createdAt_idx"
ON "TrackSkipVote"("participantId", "createdAt");

ALTER TABLE "TrackSkipVote"
ADD CONSTRAINT "TrackSkipVote_partyId_fkey"
FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrackSkipVote"
ADD CONSTRAINT "TrackSkipVote_trackId_fkey"
FOREIGN KEY ("trackId") REFERENCES "PlaylistTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrackSkipVote"
ADD CONSTRAINT "TrackSkipVote_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
