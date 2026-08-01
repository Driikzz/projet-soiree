CREATE TYPE "FlashTurnStatus" AS ENUM ('ACTIVE', 'SUBMITTED', 'EXPIRED', 'CANCELLED', 'PLAYED');

ALTER TABLE "PartySettings"
ADD COLUMN "flashModeEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "flashIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "flashSelectionWindowSeconds" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN "nextFlashTurnAt" TIMESTAMP(3);

CREATE TABLE "FlashTurn" (
    "id" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "playlistId" UUID NOT NULL,
    "trackId" UUID,
    "status" "FlashTurnStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "FlashTurn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FlashTurn_trackId_key" ON "FlashTurn"("trackId");
CREATE UNIQUE INDEX "FlashTurn_one_unresolved_per_party"
ON "FlashTurn"("partyId")
WHERE "status" IN ('ACTIVE', 'SUBMITTED');
CREATE INDEX "FlashTurn_partyId_status_startedAt_idx" ON "FlashTurn"("partyId", "status", "startedAt");
CREATE INDEX "FlashTurn_participantId_startedAt_idx" ON "FlashTurn"("participantId", "startedAt");

ALTER TABLE "FlashTurn"
ADD CONSTRAINT "FlashTurn_partyId_fkey"
FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FlashTurn"
ADD CONSTRAINT "FlashTurn_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FlashTurn"
ADD CONSTRAINT "FlashTurn_playlistId_fkey"
FOREIGN KEY ("playlistId") REFERENCES "PartyPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FlashTurn"
ADD CONSTRAINT "FlashTurn_trackId_fkey"
FOREIGN KEY ("trackId") REFERENCES "PlaylistTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PartySettings"
ADD CONSTRAINT "PartySettings_flashIntervalMinutes_check"
CHECK ("flashIntervalMinutes" BETWEEN 5 AND 1440);

ALTER TABLE "PartySettings"
ADD CONSTRAINT "PartySettings_flashSelectionWindowSeconds_check"
CHECK ("flashSelectionWindowSeconds" BETWEEN 30 AND 600);
