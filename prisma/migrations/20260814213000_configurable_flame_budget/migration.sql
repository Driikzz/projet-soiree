ALTER TABLE "PartySettings"
ADD COLUMN "flameBudgetPerParticipant" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "PartySettings"
ADD CONSTRAINT "PartySettings_flameBudgetPerParticipant_check"
CHECK ("flameBudgetPerParticipant" BETWEEN 1 AND 50);
