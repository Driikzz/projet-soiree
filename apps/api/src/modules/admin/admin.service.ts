import {
  selectNextTrack,
  type AdminDashboard,
  type PartySettings,
  type RemoveTrackRequest,
  type UpdatePartySettingsRequest,
} from "@songfest/shared";

import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../lib/prisma.js";
import { playlistTrackSelect, toPlaylistTrack } from "../tracks/track.service.js";
import { toReward } from "../rewards/reward.service.js";
import { getAdminFlashState } from "../flash/flash.service.js";

const toPartySettings = (settings: {
  defaultTrackQuota: number;
  maxTrackDurationMs: number;
  replayBlockMinutes: number;
  minimumPlaylistVotes: number;
  minimumPlaylistVotePercentage: number;
  playlistLockMinutes: number;
  playlistVotesEnabled: boolean;
  playlistChangeLockedByAdmin: boolean;
  flashModeEnabled: boolean;
  flashIntervalMinutes: number;
  flashSelectionWindowSeconds: number;
  nextFlashTurnAt: Date | null;
}): PartySettings => ({
  ...settings,
  nextFlashTurnAt: settings.nextFlashTurnAt?.toISOString() ?? null,
});

const getOwnedParty = async (adminId: string, partyId: string) => {
  const party = await prisma.party.findFirst({
    where: { id: partyId, adminId },
    select: {
      id: true,
      status: true,
      endedAt: true,
      activePlaylistId: true,
      scheduledPlaylistId: true,
      settings: {
        select: {
          defaultTrackQuota: true,
          maxTrackDurationMs: true,
          replayBlockMinutes: true,
          minimumPlaylistVotes: true,
          minimumPlaylistVotePercentage: true,
          playlistLockMinutes: true,
          playlistVotesEnabled: true,
          playlistChangeLockedByAdmin: true,
          flashModeEnabled: true,
          flashIntervalMinutes: true,
          flashSelectionWindowSeconds: true,
          nextFlashTurnAt: true,
        },
      },
      playbackState: {
        select: {
          lockedNextTrackId: true,
        },
      },
    },
  });

  if (party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
  }

  return party;
};

export const getAdminDashboard = async (
  adminId: string,
  partyId: string,
): Promise<AdminDashboard> => {
  const party = await getOwnedParty(adminId, partyId);
  if (party.settings === null) {
    throw new AppError(500, "INTERNAL_ERROR", "Les réglages de la soirée sont indisponibles.");
  }

  const [participants, recentTracks, candidates, playedTracks, flash] = await Promise.all([
    prisma.participant.findMany({
      where: { partyId },
      orderBy: [{ isActive: "desc" }, { joinedAt: "asc" }],
      select: {
        id: true,
        nickname: true,
        avatarSeed: true,
        isActive: true,
        isBlocked: true,
        joinedAt: true,
        _count: {
          select: {
            proposedTracks: {
              where: { status: { not: "REMOVED" }, flashTurn: { is: null } },
            },
          },
        },
        rewards: {
          orderBy: { assignedAt: "desc" },
          select: {
            id: true,
            partyId: true,
            participantId: true,
            type: true,
            status: true,
            usesGranted: true,
            usesRemaining: true,
            assignedAt: true,
            lastUsedAt: true,
          },
        },
      },
    }),
    prisma.playlistTrack.findMany({
      where: {
        playlist: { partyId },
        status: { not: "REMOVED" },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        ...playlistTrackSelect,
        playlist: {
          select: { name: true },
        },
      },
    }),
    (party.scheduledPlaylistId ?? party.activePlaylistId) === null
      ? []
      : prisma.playlistTrack.findMany({
          where: {
            status: "PENDING",
            isBannedForParty: false,
            playlist: { partyId },
            OR: [
              { playlistId: party.scheduledPlaylistId ?? party.activePlaylistId! },
              { priorityLevel: { gte: 100 } },
            ],
          },
          select: {
            id: true,
            proposedByParticipantId: true,
            spotifyArtistIds: true,
            voteCount: true,
            priorityLevel: true,
            createdAt: true,
          },
        }),
    prisma.playlistTrack.findMany({
      where: {
        playlist: { partyId },
        status: { in: ["PLAYING", "PLAYED"] },
      },
      orderBy: [{ playedAt: "desc" }, { playingAt: "desc" }],
      take: 10,
      select: {
        proposedByParticipantId: true,
        spotifyArtistIds: true,
      },
    }),
    getAdminFlashState(adminId, partyId),
  ]);

  const selected = selectNextTrack({
    candidates: candidates.map((track) => ({
      id: track.id,
      status: "PENDING",
      proposedByParticipantId: track.proposedByParticipantId,
      spotifyArtistIds: track.spotifyArtistIds,
      voteCount: track.voteCount,
      priorityLevel: track.priorityLevel,
      createdAtMs: track.createdAt.getTime(),
    })),
    recentTracks: playedTracks,
    lockedNextTrackId: party.playbackState?.lockedNextTrackId ?? null,
  });

  return {
    participants: participants.map((participant) => ({
      id: participant.id,
      nickname: participant.nickname,
      avatarSeed: participant.avatarSeed,
      isActive: participant.isActive,
      isBlocked: participant.isBlocked,
      joinedAt: participant.joinedAt.toISOString(),
      contributionCount: participant._count.proposedTracks,
      rewards: participant.rewards.map(toReward),
    })),
    recentTracks: recentTracks.map((track) => ({
      ...toPlaylistTrack(track),
      playlistName: track.playlist.name,
    })),
    settings: toPartySettings(party.settings),
    nextTrackId: selected?.track.id ?? null,
    flash,
  };
};

export const updatePartySettings = async (
  adminId: string,
  partyId: string,
  input: UpdatePartySettingsRequest,
) => {
  await getOwnedParty(adminId, partyId);
  const updateData = {
    ...(input.defaultTrackQuota === undefined
      ? {}
      : { defaultTrackQuota: input.defaultTrackQuota }),
    ...(input.maxTrackDurationMs === undefined
      ? {}
      : { maxTrackDurationMs: input.maxTrackDurationMs }),
    ...(input.replayBlockMinutes === undefined
      ? {}
      : { replayBlockMinutes: input.replayBlockMinutes }),
    ...(input.minimumPlaylistVotes === undefined
      ? {}
      : { minimumPlaylistVotes: input.minimumPlaylistVotes }),
    ...(input.minimumPlaylistVotePercentage === undefined
      ? {}
      : { minimumPlaylistVotePercentage: input.minimumPlaylistVotePercentage }),
    ...(input.playlistLockMinutes === undefined
      ? {}
      : { playlistLockMinutes: input.playlistLockMinutes }),
    ...(input.playlistVotesEnabled === undefined
      ? {}
      : { playlistVotesEnabled: input.playlistVotesEnabled }),
    ...(input.playlistChangeLockedByAdmin === undefined
      ? {}
      : { playlistChangeLockedByAdmin: input.playlistChangeLockedByAdmin }),
    ...(input.flashModeEnabled === undefined
      ? {}
      : {
          flashModeEnabled: input.flashModeEnabled,
          ...(input.flashModeEnabled ? {} : { nextFlashTurnAt: null }),
        }),
    ...(input.flashIntervalMinutes === undefined
      ? {}
      : {
          flashIntervalMinutes: input.flashIntervalMinutes,
          nextFlashTurnAt: new Date(Date.now() + input.flashIntervalMinutes * 60_000),
        }),
    ...(input.flashSelectionWindowSeconds === undefined
      ? {}
      : { flashSelectionWindowSeconds: input.flashSelectionWindowSeconds }),
  };

  const settings = await prisma.$transaction(async (transaction) => {
    const updatedSettings = await transaction.partySettings.update({
      where: { partyId },
      data: updateData,
      select: {
        defaultTrackQuota: true,
        maxTrackDurationMs: true,
        replayBlockMinutes: true,
        minimumPlaylistVotes: true,
        minimumPlaylistVotePercentage: true,
        playlistLockMinutes: true,
        playlistVotesEnabled: true,
        playlistChangeLockedByAdmin: true,
        flashModeEnabled: true,
        flashIntervalMinutes: true,
        flashSelectionWindowSeconds: true,
        nextFlashTurnAt: true,
      },
    });
    await transaction.party.update({
      where: { id: partyId },
      data: {
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "ADMIN",
            adminActorId: adminId,
            action: "party.settings-updated",
            entityType: "PartySettings",
          },
        },
      },
    });
    return updatedSettings;
  });

  return toPartySettings(settings);
};

export const blockParticipant = async (adminId: string, partyId: string, participantId: string) => {
  await getOwnedParty(adminId, partyId);
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, partyId },
    select: { id: true, isBlocked: true },
  });
  if (participant === null) {
    throw new AppError(404, "PARTICIPANT_NOT_FOUND", "Ce participant n’existe pas.");
  }
  if (participant.isBlocked) {
    return participant;
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.participant.update({
      where: { id: participantId },
      data: {
        isBlocked: true,
        isActive: false,
        blockedAt: now,
        lastSeenAt: now,
      },
    }),
    prisma.session.updateMany({
      where: {
        participantId,
        revokedAt: null,
      },
      data: { revokedAt: now },
    }),
    prisma.party.update({
      where: { id: partyId },
      data: {
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "ADMIN",
            adminActorId: adminId,
            action: "participant.blocked",
            entityType: "Participant",
            entityId: participantId,
          },
        },
      },
    }),
  ]);

  return { id: participantId, isBlocked: true };
};

export const removeTrack = async (
  adminId: string,
  partyId: string,
  trackId: string,
  input: RemoveTrackRequest,
) => {
  await getOwnedParty(adminId, partyId);
  const track = await prisma.playlistTrack.findFirst({
    where: {
      id: trackId,
      playlist: { partyId },
    },
    select: { id: true, status: true },
  });
  if (track === null) {
    throw new AppError(404, "TRACK_NOT_FOUND", "Ce morceau n’existe pas.");
  }
  if (track.status !== "PENDING") {
    throw new AppError(
      409,
      "TRACK_NOT_REMOVABLE",
      "Un morceau déjà sélectionné ou joué ne peut plus être retiré.",
    );
  }

  await prisma.$transaction([
    prisma.playlistTrack.update({
      where: { id: trackId },
      data: {
        status: "REMOVED",
        removedAt: new Date(),
        removedReason: input.reason ?? "Retiré par l’organisateur",
      },
    }),
    prisma.party.update({
      where: { id: partyId },
      data: {
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "ADMIN",
            adminActorId: adminId,
            action: "track.removed",
            entityType: "PlaylistTrack",
            entityId: trackId,
          },
        },
      },
    }),
  ]);

  return { id: trackId };
};

export const forceTrack = async (adminId: string, partyId: string, trackId: string) => {
  const party = await getOwnedParty(adminId, partyId);
  if (party.activePlaylistId === null) {
    throw new AppError(409, "PLAYBACK_NOT_READY", "Aucune playlist n’est active.");
  }
  const track = await prisma.playlistTrack.findFirst({
    where: {
      id: trackId,
      playlistId: party.activePlaylistId,
      playlist: { partyId },
      status: "PENDING",
    },
    select: { id: true },
  });
  if (track === null) {
    throw new AppError(
      409,
      "TRACK_NOT_VOTABLE",
      "Seul un morceau en attente dans la playlist active peut être forcé.",
    );
  }

  await prisma.$transaction([
    prisma.playlistTrack.update({
      where: { id: trackId },
      data: { priorityLevel: 100 },
    }),
    prisma.party.update({
      where: { id: partyId },
      data: {
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "ADMIN",
            adminActorId: adminId,
            action: "track.forced",
            entityType: "PlaylistTrack",
            entityId: trackId,
          },
        },
      },
    }),
  ]);

  return { id: trackId };
};

export const endParty = async (adminId: string, partyId: string) => {
  const party = await getOwnedParty(adminId, partyId);
  if (party.status === "ENDED") {
    return { id: partyId, endedAt: party.endedAt ?? new Date() };
  }

  const endedAt = new Date();
  await prisma.$transaction([
    prisma.session.updateMany({
      where: {
        participant: { partyId },
        revokedAt: null,
      },
      data: { revokedAt: endedAt },
    }),
    prisma.participant.updateMany({
      where: { partyId, isActive: true },
      data: { isActive: false, lastSeenAt: endedAt },
    }),
    prisma.flashTurn.updateMany({
      where: {
        partyId,
        status: { in: ["ACTIVE", "SUBMITTED"] },
      },
      data: {
        status: "CANCELLED",
        resolvedAt: endedAt,
      },
    }),
    prisma.partySettings.update({
      where: { partyId },
      data: { nextFlashTurnAt: null },
    }),
    prisma.party.update({
      where: { id: partyId },
      data: {
        status: "ENDED",
        endedAt,
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "ADMIN",
            adminActorId: adminId,
            action: "party.ended",
            entityType: "Party",
            entityId: partyId,
          },
        },
      },
    }),
  ]);

  return { id: partyId, endedAt };
};
