import type {
  CreatePlaylistRequest,
  PlaylistSummary,
  UpdatePlaylistRequest,
} from "@songfest/shared";
import { calculateRemainingQuota } from "@songfest/shared";

import { AppError } from "../../errors/app-error.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

const playlistSelect = {
  id: true,
  partyId: true,
  name: true,
  description: true,
  visualKey: true,
  quotaPerParticipant: true,
  isOpen: true,
  trackVotesEnabled: true,
  explicitContentAllowed: true,
  activatedAt: true,
  createdAt: true,
  party: {
    select: {
      activePlaylistId: true,
      scheduledPlaylistId: true,
    },
  },
  _count: {
    select: {
      tracks: {
        where: {
          status: { not: "REMOVED" },
        },
      },
      playlistVotes: true,
    },
  },
} as const;

type PlaylistRecord = Awaited<
  ReturnType<typeof prisma.partyPlaylist.findFirst<{ select: typeof playlistSelect }>>
>;

const ensureOwnedParty = async (adminId: string, partyId: string) => {
  const party = await prisma.party.findFirst({
    where: { id: partyId, adminId },
    select: { id: true, status: true },
  });

  if (party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
  }

  return party;
};

const getContributorCounts = async (playlistIds: string[]) => {
  if (playlistIds.length === 0) {
    return new Map<string, number>();
  }

  const contributors = await prisma.playlistTrack.groupBy({
    by: ["playlistId", "proposedByParticipantId"],
    where: {
      playlistId: { in: playlistIds },
      proposedByParticipantId: { not: null },
      status: { not: "REMOVED" },
    },
  });

  const counts = new Map<string, number>();
  for (const contributor of contributors) {
    counts.set(contributor.playlistId, (counts.get(contributor.playlistId) ?? 0) + 1);
  }

  return counts;
};

const getParticipantTrackCounts = async (playlistIds: string[], participantId: string) => {
  if (playlistIds.length === 0) {
    return new Map<string, number>();
  }

  const counts = await prisma.playlistTrack.groupBy({
    by: ["playlistId"],
    where: {
      playlistId: { in: playlistIds },
      proposedByParticipantId: participantId,
      status: { not: "REMOVED" },
    },
    _count: { _all: true },
  });

  return new Map(counts.map((count) => [count.playlistId, count._count._all]));
};

const getExtraTrackQuotas = async (
  playlistIds: string[],
  partyId: string,
  participantId: string,
) => {
  const [rewards, rewardedTracks] = await Promise.all([
    prisma.reward.aggregate({
      where: {
        partyId,
        participantId,
        type: "EXTRA_TRACK",
        status: "AVAILABLE",
        usesRemaining: { gt: 0 },
      },
      _sum: { usesRemaining: true },
    }),
    prisma.playlistTrack.groupBy({
      by: ["playlistId"],
      where: {
        playlistId: { in: playlistIds },
        proposedByParticipantId: participantId,
        status: { not: "REMOVED" },
        reward: { type: "EXTRA_TRACK" },
      },
      _count: { _all: true },
    }),
  ]);
  const availableUses = rewards._sum.usesRemaining ?? 0;

  return new Map(
    playlistIds.map((playlistId) => [
      playlistId,
      availableUses +
        (rewardedTracks.find((track) => track.playlistId === playlistId)?._count._all ?? 0),
    ]),
  );
};

const toPlaylistSummary = (
  playlist: NonNullable<PlaylistRecord>,
  contributorCount: number,
  participantTrackCount?: number,
  extraTrackQuota = 0,
  participantVotedPlaylistId?: string | null,
): PlaylistSummary => ({
  id: playlist.id,
  partyId: playlist.partyId,
  name: playlist.name,
  description: playlist.description,
  visualKey: playlist.visualKey as PlaylistSummary["visualKey"],
  quotaPerParticipant: playlist.quotaPerParticipant,
  isOpen: playlist.isOpen,
  trackVotesEnabled: playlist.trackVotesEnabled,
  explicitContentAllowed: playlist.explicitContentAllowed,
  isActive: playlist.party.activePlaylistId === playlist.id,
  isScheduled: playlist.party.scheduledPlaylistId === playlist.id,
  trackCount: playlist._count.tracks,
  contributorCount,
  playlistVoteCount: playlist._count.playlistVotes,
  ...(participantVotedPlaylistId === undefined
    ? {}
    : { participantHasVoted: participantVotedPlaylistId === playlist.id }),
  ...(participantTrackCount === undefined
    ? {}
    : {
        participantTrackCount,
        extraTrackQuota,
        remainingTrackQuota: calculateRemainingQuota({
          baseQuota: playlist.quotaPerParticipant,
          extraTrackUses: extraTrackQuota,
          activeContributionCount: participantTrackCount,
        }),
      }),
  activatedAt: playlist.activatedAt?.toISOString() ?? null,
  createdAt: playlist.createdAt.toISOString(),
});

const mapPlaylistList = async (
  playlists: NonNullable<PlaylistRecord>[],
  participantId?: string,
) => {
  const playlistIds = playlists.map((playlist) => playlist.id);
  const [contributorCounts, participantTrackCounts, extraTrackQuotas, participantVote] =
    await Promise.all([
      getContributorCounts(playlistIds),
      participantId === undefined
        ? Promise.resolve(new Map<string, number>())
        : getParticipantTrackCounts(playlistIds, participantId),
      participantId === undefined || playlists[0] === undefined
        ? Promise.resolve(new Map<string, number>())
        : getExtraTrackQuotas(playlistIds, playlists[0].partyId, participantId),
      participantId === undefined
        ? Promise.resolve(null)
        : prisma.playlistVote.findUnique({
            where: { participantId },
            select: { playlistId: true },
          }),
    ]);

  return playlists.map((playlist) =>
    toPlaylistSummary(
      playlist,
      contributorCounts.get(playlist.id) ?? 0,
      participantId === undefined ? undefined : (participantTrackCounts.get(playlist.id) ?? 0),
      extraTrackQuotas.get(playlist.id) ?? 0,
      participantId === undefined ? undefined : (participantVote?.playlistId ?? null),
    ),
  );
};

const mapSinglePlaylist = async (playlist: NonNullable<PlaylistRecord>) => {
  const summaries = await mapPlaylistList([playlist]);
  const summary = summaries[0];

  if (summary === undefined) {
    throw new Error("Playlist mapping unexpectedly returned no result");
  }

  return summary;
};

export const listAdminPlaylists = async (adminId: string, partyId: string) => {
  await ensureOwnedParty(adminId, partyId);
  const playlists = await prisma.partyPlaylist.findMany({
    where: { partyId },
    orderBy: { createdAt: "asc" },
    select: playlistSelect,
  });

  return mapPlaylistList(playlists);
};

export const listParticipantPlaylists = async (participantId: string, partyId: string) => {
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, partyId, isBlocked: false },
    select: { id: true },
  });

  if (participant === null) {
    throw new AppError(403, "FORBIDDEN", "Tu n’appartiens pas à cette soirée.");
  }

  const playlists = await prisma.partyPlaylist.findMany({
    where: { partyId },
    orderBy: { createdAt: "asc" },
    select: playlistSelect,
  });

  return mapPlaylistList(playlists, participant.id);
};

export const createPlaylist = async (
  adminId: string,
  partyId: string,
  input: CreatePlaylistRequest,
) => {
  const party = await ensureOwnedParty(adminId, partyId);
  if (party.status === "ENDED") {
    throw new AppError(409, "PLAYLIST_LOCKED", "La soirée est terminée.");
  }

  try {
    const playlist = await prisma.$transaction(async (transaction) => {
      const createdPlaylist = await transaction.partyPlaylist.create({
        data: {
          partyId,
          ...input,
        },
        select: playlistSelect,
      });

      await transaction.party.update({
        where: { id: partyId },
        data: {
          stateVersion: { increment: 1 },
          auditLogs: {
            create: {
              actorType: "ADMIN",
              adminActorId: adminId,
              action: "playlist.created",
              entityType: "PartyPlaylist",
              entityId: createdPlaylist.id,
            },
          },
        },
      });

      return createdPlaylist;
    });

    return toPlaylistSummary(playlist, 0);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(
        409,
        "PLAYLIST_NAME_TAKEN",
        "Une playlist porte déjà ce nom dans la soirée.",
      );
    }

    throw error;
  }
};

const getOwnedPlaylist = async (adminId: string, playlistId: string) => {
  const playlist = await prisma.partyPlaylist.findFirst({
    where: {
      id: playlistId,
      party: { adminId },
    },
    select: {
      id: true,
      partyId: true,
      party: {
        select: {
          status: true,
          activePlaylistId: true,
          scheduledPlaylistId: true,
        },
      },
      _count: { select: { tracks: true } },
    },
  });

  if (playlist === null) {
    throw new AppError(404, "PLAYLIST_NOT_FOUND", "Cette playlist n’existe pas.");
  }

  return playlist;
};

export const updatePlaylist = async (
  adminId: string,
  playlistId: string,
  input: UpdatePlaylistRequest,
) => {
  const existingPlaylist = await getOwnedPlaylist(adminId, playlistId);
  if (existingPlaylist.party.status === "ENDED") {
    throw new AppError(409, "PLAYLIST_LOCKED", "La soirée est terminée.");
  }

  const updateData = {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.visualKey === undefined ? {} : { visualKey: input.visualKey }),
    ...(input.quotaPerParticipant === undefined
      ? {}
      : { quotaPerParticipant: input.quotaPerParticipant }),
    ...(input.isOpen === undefined ? {} : { isOpen: input.isOpen }),
    ...(input.trackVotesEnabled === undefined
      ? {}
      : { trackVotesEnabled: input.trackVotesEnabled }),
    ...(input.explicitContentAllowed === undefined
      ? {}
      : { explicitContentAllowed: input.explicitContentAllowed }),
  };

  try {
    const playlist = await prisma.$transaction(async (transaction) => {
      const updatedPlaylist = await transaction.partyPlaylist.update({
        where: { id: playlistId },
        data: updateData,
        select: playlistSelect,
      });
      await transaction.party.update({
        where: { id: existingPlaylist.partyId },
        data: {
          stateVersion: { increment: 1 },
          auditLogs: {
            create: {
              actorType: "ADMIN",
              adminActorId: adminId,
              action: "playlist.updated",
              entityType: "PartyPlaylist",
              entityId: playlistId,
            },
          },
        },
      });

      return updatedPlaylist;
    });

    return mapSinglePlaylist(playlist);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(
        409,
        "PLAYLIST_NAME_TAKEN",
        "Une playlist porte déjà ce nom dans la soirée.",
      );
    }

    throw error;
  }
};

export const activatePlaylist = async (adminId: string, playlistId: string) => {
  const existingPlaylist = await getOwnedPlaylist(adminId, playlistId);
  if (existingPlaylist.party.status === "ENDED") {
    throw new AppError(409, "PLAYLIST_LOCKED", "La soirée est terminée.");
  }

  const playlist = await prisma.$transaction(async (transaction) => {
    await transaction.party.update({
      where: { id: existingPlaylist.partyId },
      data: {
        activePlaylistId: playlistId,
        scheduledPlaylistId: null,
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "ADMIN",
            adminActorId: adminId,
            action: "playlist.activated",
            entityType: "PartyPlaylist",
            entityId: playlistId,
          },
        },
      },
    });

    return transaction.partyPlaylist.update({
      where: { id: playlistId },
      data: { activatedAt: new Date() },
      select: playlistSelect,
    });
  });

  return mapSinglePlaylist(playlist);
};

export const deletePlaylist = async (adminId: string, playlistId: string) => {
  const playlist = await getOwnedPlaylist(adminId, playlistId);

  if (playlist.party.status === "ENDED") {
    throw new AppError(409, "PLAYLIST_LOCKED", "La soirée est terminée.");
  }

  if (playlist.party.activePlaylistId === playlistId) {
    throw new AppError(409, "PLAYLIST_LOCKED", "La playlist active ne peut pas être supprimée.");
  }

  if (playlist.party.scheduledPlaylistId === playlistId) {
    throw new AppError(
      409,
      "PLAYLIST_LOCKED",
      "La playlist programmée ne peut pas être supprimée.",
    );
  }

  if (playlist._count.tracks > 0) {
    throw new AppError(
      409,
      "PLAYLIST_NOT_EMPTY",
      "Supprime d’abord les morceaux de cette playlist.",
    );
  }

  await prisma.$transaction([
    prisma.partyPlaylist.delete({ where: { id: playlistId } }),
    prisma.party.update({
      where: { id: playlist.partyId },
      data: {
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "ADMIN",
            adminActorId: adminId,
            action: "playlist.deleted",
            entityType: "PartyPlaylist",
            entityId: playlistId,
          },
        },
      },
    }),
  ]);

  return { partyId: playlist.partyId };
};
