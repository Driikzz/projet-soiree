-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PartyStatus" AS ENUM ('DRAFT', 'OPEN', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "TrackStatus" AS ENUM ('PENDING', 'SELECTED', 'QUEUED', 'PLAYING', 'PLAYED', 'SKIPPED', 'REMOVED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('EXTRA_TRACK', 'PRIORITY_TRACK', 'DOUBLE_TRACK', 'CHOOSE_NEXT_PLAYLIST');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('AVAILABLE', 'CONSUMED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SessionActorType" AS ENUM ('ADMIN', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('SYSTEM', 'ADMIN', 'PARTICIPANT');

-- CreateTable
CREATE TABLE "Admin" (
    "id" UUID NOT NULL,
    "username" VARCHAR(64) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotifyConnection" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "spotifyAccountId" VARCHAR(128) NOT NULL,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotifyConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" UUID NOT NULL,
    "adminId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" CHAR(6) NOT NULL,
    "status" "PartyStatus" NOT NULL DEFAULT 'DRAFT',
    "activePlaylistId" UUID,
    "scheduledPlaylistId" UUID,
    "selectedDeviceId" VARCHAR(255),
    "stateVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartySettings" (
    "id" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "defaultTrackQuota" INTEGER NOT NULL DEFAULT 5,
    "maxTrackDurationMs" INTEGER NOT NULL DEFAULT 480000,
    "replayBlockMinutes" INTEGER NOT NULL DEFAULT 180,
    "minimumPlaylistVotes" INTEGER NOT NULL DEFAULT 4,
    "minimumPlaylistVotePercentage" INTEGER NOT NULL DEFAULT 40,
    "playlistLockMinutes" INTEGER NOT NULL DEFAULT 15,
    "playlistVotesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "nickname" VARCHAR(40) NOT NULL,
    "normalizedNickname" VARCHAR(40) NOT NULL,
    "avatarSeed" VARCHAR(64) NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(3),

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyPlaylist" (
    "id" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500),
    "visualKey" VARCHAR(40) NOT NULL,
    "quotaPerParticipant" INTEGER NOT NULL DEFAULT 5,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "trackVotesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "explicitContentAllowed" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistTrack" (
    "id" UUID NOT NULL,
    "playlistId" UUID NOT NULL,
    "proposedByParticipantId" UUID,
    "rewardId" UUID,
    "spotifyTrackId" VARCHAR(64) NOT NULL,
    "spotifyUri" VARCHAR(128) NOT NULL,
    "spotifyUrl" VARCHAR(500) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "artistNames" TEXT[],
    "spotifyArtistIds" TEXT[],
    "coverUrl" VARCHAR(500),
    "durationMs" INTEGER NOT NULL,
    "isExplicit" BOOLEAN NOT NULL DEFAULT false,
    "status" "TrackStatus" NOT NULL DEFAULT 'PENDING',
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "priorityLevel" INTEGER NOT NULL DEFAULT 0,
    "sequenceGroupId" UUID,
    "sequencePosition" INTEGER,
    "isBannedForParty" BOOLEAN NOT NULL DEFAULT false,
    "selectedAt" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3),
    "playingAt" TIMESTAMP(3),
    "playedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "removedReason" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaylistTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackVote" (
    "id" UUID NOT NULL,
    "trackId" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistVote" (
    "id" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "playlistId" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaylistVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "type" "RewardType" NOT NULL,
    "status" "RewardStatus" NOT NULL DEFAULT 'AVAILABLE',
    "usesGranted" INTEGER NOT NULL DEFAULT 1,
    "usesRemaining" INTEGER NOT NULL DEFAULT 1,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybackState" (
    "id" UUID NOT NULL,
    "partyId" UUID NOT NULL,
    "currentTrackId" UUID,
    "queuedTrackId" UUID,
    "lockedNextTrackId" UUID,
    "spotifyTrackId" VARCHAR(64),
    "progressMs" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "isPlaying" BOOLEAN NOT NULL DEFAULT false,
    "lastSpotifySyncAt" TIMESTAMP(3),
    "lastQueueCommandAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybackState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "csrfTokenHash" CHAR(64) NOT NULL,
    "actorType" "SessionActorType" NOT NULL,
    "adminId" UUID,
    "participantId" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "partyId" UUID,
    "actorType" "AuditActorType" NOT NULL,
    "adminActorId" UUID,
    "participantActorId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "SpotifyConnection_adminId_key" ON "SpotifyConnection"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "SpotifyConnection_spotifyAccountId_key" ON "SpotifyConnection"("spotifyAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Party_code_key" ON "Party"("code");

-- CreateIndex
CREATE INDEX "Party_adminId_status_idx" ON "Party"("adminId", "status");

-- CreateIndex
CREATE INDEX "Party_code_status_idx" ON "Party"("code", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartySettings_partyId_key" ON "PartySettings"("partyId");

-- CreateIndex
CREATE INDEX "Participant_partyId_isActive_isBlocked_idx" ON "Participant"("partyId", "isActive", "isBlocked");

-- CreateIndex
CREATE INDEX "Participant_partyId_lastSeenAt_idx" ON "Participant"("partyId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_partyId_normalizedNickname_key" ON "Participant"("partyId", "normalizedNickname");

-- CreateIndex
CREATE INDEX "PartyPlaylist_partyId_isOpen_idx" ON "PartyPlaylist"("partyId", "isOpen");

-- CreateIndex
CREATE UNIQUE INDEX "PartyPlaylist_partyId_name_key" ON "PartyPlaylist"("partyId", "name");

-- CreateIndex
CREATE INDEX "PlaylistTrack_playlistId_status_createdAt_idx" ON "PlaylistTrack"("playlistId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PlaylistTrack_proposedByParticipantId_playlistId_idx" ON "PlaylistTrack"("proposedByParticipantId", "playlistId");

-- CreateIndex
CREATE INDEX "PlaylistTrack_sequenceGroupId_sequencePosition_idx" ON "PlaylistTrack"("sequenceGroupId", "sequencePosition");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistTrack_playlistId_spotifyTrackId_key" ON "PlaylistTrack"("playlistId", "spotifyTrackId");

-- CreateIndex
CREATE INDEX "TrackVote_participantId_createdAt_idx" ON "TrackVote"("participantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrackVote_trackId_participantId_key" ON "TrackVote"("trackId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistVote_participantId_key" ON "PlaylistVote"("participantId");

-- CreateIndex
CREATE INDEX "PlaylistVote_partyId_playlistId_idx" ON "PlaylistVote"("partyId", "playlistId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistVote_partyId_participantId_key" ON "PlaylistVote"("partyId", "participantId");

-- CreateIndex
CREATE INDEX "Reward_participantId_status_idx" ON "Reward"("participantId", "status");

-- CreateIndex
CREATE INDEX "Reward_partyId_assignedAt_idx" ON "Reward"("partyId", "assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlaybackState_partyId_key" ON "PlaybackState"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_actorType_expiresAt_idx" ON "Session"("actorType", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_participantId_revokedAt_idx" ON "Session"("participantId", "revokedAt");

-- CreateIndex
CREATE INDEX "Session_adminId_revokedAt_idx" ON "Session"("adminId", "revokedAt");

-- CreateIndex
CREATE INDEX "AuditLog_partyId_createdAt_idx" ON "AuditLog"("partyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_createdAt_idx" ON "AuditLog"("actorType", "createdAt");

-- AddForeignKey
ALTER TABLE "SpotifyConnection" ADD CONSTRAINT "SpotifyConnection_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_activePlaylistId_fkey" FOREIGN KEY ("activePlaylistId") REFERENCES "PartyPlaylist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_scheduledPlaylistId_fkey" FOREIGN KEY ("scheduledPlaylistId") REFERENCES "PartyPlaylist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartySettings" ADD CONSTRAINT "PartySettings_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyPlaylist" ADD CONSTRAINT "PartyPlaylist_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "PartyPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_proposedByParticipantId_fkey" FOREIGN KEY ("proposedByParticipantId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistTrack" ADD CONSTRAINT "PlaylistTrack_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackVote" ADD CONSTRAINT "TrackVote_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "PlaylistTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackVote" ADD CONSTRAINT "TrackVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistVote" ADD CONSTRAINT "PlaylistVote_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistVote" ADD CONSTRAINT "PlaylistVote_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "PartyPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistVote" ADD CONSTRAINT "PlaylistVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackState" ADD CONSTRAINT "PlaybackState_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackState" ADD CONSTRAINT "PlaybackState_currentTrackId_fkey" FOREIGN KEY ("currentTrackId") REFERENCES "PlaylistTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackState" ADD CONSTRAINT "PlaybackState_queuedTrackId_fkey" FOREIGN KEY ("queuedTrackId") REFERENCES "PlaylistTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackState" ADD CONSTRAINT "PlaybackState_lockedNextTrackId_fkey" FOREIGN KEY ("lockedNextTrackId") REFERENCES "PlaylistTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_adminActorId_fkey" FOREIGN KEY ("adminActorId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_participantActorId_fkey" FOREIGN KEY ("participantActorId") REFERENCES "Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Only one active party may control an administrator's Spotify account.
CREATE UNIQUE INDEX "Party_one_active_per_admin"
ON "Party" ("adminId")
WHERE "status" = 'ACTIVE';

-- Domain invariants not expressible in the Prisma schema.
ALTER TABLE "PartySettings"
ADD CONSTRAINT "PartySettings_values_check" CHECK (
    "defaultTrackQuota" >= 0
    AND "maxTrackDurationMs" > 0
    AND "replayBlockMinutes" >= 0
    AND "minimumPlaylistVotes" >= 1
    AND "minimumPlaylistVotePercentage" BETWEEN 1 AND 100
    AND "playlistLockMinutes" >= 0
);

ALTER TABLE "PartyPlaylist"
ADD CONSTRAINT "PartyPlaylist_quota_check" CHECK ("quotaPerParticipant" >= 0);

ALTER TABLE "PlaylistTrack"
ADD CONSTRAINT "PlaylistTrack_values_check" CHECK (
    "durationMs" > 0
    AND "voteCount" >= 0
    AND "priorityLevel" >= 0
    AND ("sequencePosition" IS NULL OR "sequencePosition" IN (1, 2))
);

ALTER TABLE "Reward"
ADD CONSTRAINT "Reward_uses_check" CHECK (
    "usesGranted" > 0
    AND "usesRemaining" >= 0
    AND "usesRemaining" <= "usesGranted"
);

ALTER TABLE "PlaybackState"
ADD CONSTRAINT "PlaybackState_progress_check" CHECK (
    "progressMs" >= 0
    AND "durationMs" >= 0
);

ALTER TABLE "Session"
ADD CONSTRAINT "Session_actor_check" CHECK (
    (
        "actorType" = 'ADMIN'
        AND "adminId" IS NOT NULL
        AND "participantId" IS NULL
    )
    OR
    (
        "actorType" = 'PARTICIPANT'
        AND "participantId" IS NOT NULL
        AND "adminId" IS NULL
    )
);

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_actor_check" CHECK (
    (
        "actorType" = 'SYSTEM'
        AND "adminActorId" IS NULL
        AND "participantActorId" IS NULL
    )
    OR
    (
        "actorType" = 'ADMIN'
        AND "adminActorId" IS NOT NULL
        AND "participantActorId" IS NULL
    )
    OR
    (
        "actorType" = 'PARTICIPANT'
        AND "participantActorId" IS NOT NULL
        AND "adminActorId" IS NULL
    )
);
