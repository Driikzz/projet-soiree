import type {
  AddTrackRequest,
  ParticipantPlaylistTrack,
  ParticipantTrackQuota,
  PlaylistTrack,
  SpotifyTrackSnapshot,
  TrackFlameBudget,
  TrackRejectionReason,
} from "@songfest/shared";
import {
  calculateRemainingQuota,
  calculateTrackPriorityScore,
  findTrackRejectionReason,
  MAX_FLAMES_PER_TRACK,
  TRACK_FLAME_BUDGET,
} from "@songfest/shared";

import { AppError } from "../../errors/app-error.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { runSerializableTransaction } from "../../lib/serializable-transaction.js";
import { getSpotifyTrackSnapshot } from "../spotify/spotify.service.js";

const DEFAULT_MAX_TRACK_DURATION_MS = 8 * 60_000;
const DEFAULT_REPLAY_BLOCK_MINUTES = 180;

export const playlistTrackSelect = {
  id: true,
  playlistId: true,
  spotifyTrackId: true,
  spotifyUri: true,
  spotifyUrl: true,
  title: true,
  artistNames: true,
  spotifyArtistIds: true,
  coverUrl: true,
  durationMs: true,
  isExplicit: true,
  voteCount: true,
  voteSupporterCount: true,
  status: true,
  createdAt: true,
  proposedBy: {
    select: {
      id: true,
      nickname: true,
      avatarSeed: true,
    },
  },
} as const;

type TrackRecord = Awaited<
  ReturnType<typeof prisma.playlistTrack.findFirst<{ select: typeof playlistTrackSelect }>>
>;

export const toPlaylistTrack = (track: NonNullable<TrackRecord>): PlaylistTrack => ({
  id: track.id,
  playlistId: track.playlistId,
  spotifyTrackId: track.spotifyTrackId,
  spotifyUri: track.spotifyUri,
  spotifyUrl: track.spotifyUrl,
  title: track.title,
  artistNames: track.artistNames,
  spotifyArtistIds: track.spotifyArtistIds,
  coverUrl: track.coverUrl,
  durationMs: track.durationMs,
  isExplicit: track.isExplicit,
  proposedBy: track.proposedBy,
  voteCount: track.voteCount,
  status: track.status,
  createdAt: track.createdAt.toISOString(),
});

const toParticipantPlaylistTrack = (
  track: NonNullable<TrackRecord>,
  participantFlameCount = 0,
  activeParticipantCount = 0,
): ParticipantPlaylistTrack => ({
  ...toPlaylistTrack(track),
  participantHasVoted: participantFlameCount > 0,
  participantFlameCount,
  voteSupporterCount: track.voteSupporterCount,
  voteScore: calculateTrackPriorityScore(
    track.voteSupporterCount,
    track.voteCount,
    activeParticipantCount,
  ),
});

const throwTrackRejection = (reason: TrackRejectionReason): never => {
  const messages: Record<TrackRejectionReason, string> = {
    TRACK_ALREADY_EXISTS: "Ce morceau est déjà présent dans cette playlist.",
    TRACK_RECENTLY_PLAYED: "Ce morceau a été joué récemment pendant la soirée.",
    TRACK_TOO_LONG: "Ce morceau dépasse la durée maximale autorisée.",
    TRACK_EXPLICIT_NOT_ALLOWED: "Cette playlist n’accepte pas les morceaux explicites.",
    TRACK_BANNED: "Ce morceau a été interdit par l’organisateur.",
  };

  throw new AppError(409, reason, messages[reason]);
};

const getParticipantPlaylist = async (participantId: string, playlistId: string) => {
  const playlist = await prisma.partyPlaylist.findFirst({
    where: {
      id: playlistId,
      party: {
        participants: {
          some: {
            id: participantId,
            isActive: true,
            isBlocked: false,
          },
        },
      },
    },
    select: {
      id: true,
      partyId: true,
      isOpen: true,
      party: {
        select: {
          adminId: true,
          status: true,
          _count: {
            select: {
              participants: {
                where: { isActive: true, isBlocked: false },
              },
            },
          },
        },
      },
    },
  });

  if (playlist === null) {
    throw new AppError(404, "PLAYLIST_NOT_FOUND", "Cette playlist n’existe pas.");
  }

  return playlist;
};

const ensurePlaylistAcceptsTracks = (playlist: {
  isOpen: boolean;
  party: { status: "DRAFT" | "OPEN" | "ACTIVE" | "ENDED" };
}) => {
  if (!playlist.isOpen || !["OPEN", "ACTIVE"].includes(playlist.party.status)) {
    throw new AppError(
      409,
      "PLAYLIST_LOCKED",
      "Cette playlist n’accepte pas de nouveaux morceaux.",
    );
  }
};

export const listPlaylistTracks = async (participantId: string, playlistId: string) => {
  const playlist = await getParticipantPlaylist(participantId, playlistId);
  const [tracks, participantVotes] = await Promise.all([
    prisma.playlistTrack.findMany({
      where: {
        playlistId,
        status: { not: "REMOVED" },
        flashTurn: { is: null },
      },
      orderBy: { createdAt: "asc" },
      select: playlistTrackSelect,
    }),
    prisma.trackVote.findMany({
      where: {
        participantId,
        track: { playlistId },
      },
      select: { trackId: true, weight: true, track: { select: { status: true } } },
    }),
  ]);
  const participantFlames = new Map(
    participantVotes.map((vote) => [vote.trackId, vote.weight] as const),
  );
  const usedFlames = participantVotes.reduce(
    (total, vote) => total + (vote.track.status === "PENDING" ? vote.weight : 0),
    0,
  );
  const flameBudget: TrackFlameBudget = {
    total: TRACK_FLAME_BUDGET,
    used: usedFlames,
    remaining: Math.max(0, TRACK_FLAME_BUDGET - usedFlames),
    maxPerTrack: MAX_FLAMES_PER_TRACK,
  };

  return {
    tracks: tracks.map((track) =>
      toParticipantPlaylistTrack(
        track,
        track.status === "PENDING" ? (participantFlames.get(track.id) ?? 0) : 0,
        playlist.party._count.participants,
      ),
    ),
    flameBudget,
  };
};

interface QuotaSnapshot {
  used: number;
  rewardedTrackCount: number;
  availableExtraTrackUses: number;
}

const getQuotaSnapshot = async (
  transaction: Prisma.TransactionClient,
  partyId: string,
  playlistId: string,
  participantId: string,
): Promise<QuotaSnapshot> => {
  const [used, rewardedTrackCount, availableRewards] = await Promise.all([
    transaction.playlistTrack.count({
      where: {
        playlistId,
        proposedByParticipantId: participantId,
        status: { not: "REMOVED" },
        flashTurn: { is: null },
      },
    }),
    transaction.playlistTrack.count({
      where: {
        playlistId,
        proposedByParticipantId: participantId,
        status: { not: "REMOVED" },
        reward: { type: "EXTRA_TRACK" },
        flashTurn: { is: null },
      },
    }),
    transaction.reward.aggregate({
      where: {
        partyId,
        participantId,
        type: "EXTRA_TRACK",
        status: "AVAILABLE",
        usesRemaining: { gt: 0 },
      },
      _sum: { usesRemaining: true },
    }),
  ]);

  return {
    used,
    rewardedTrackCount,
    availableExtraTrackUses: availableRewards._sum.usesRemaining ?? 0,
  };
};

const createTrackInTransaction = async (
  transaction: Prisma.TransactionClient,
  participantId: string,
  playlistId: string,
  input: AddTrackRequest,
  spotifyTrack: SpotifyTrackSnapshot,
  options: {
    bypassQuota?: boolean;
    flashTurnId?: string;
  } = {},
) => {
  const playlist = await transaction.partyPlaylist.findFirst({
    where: {
      id: playlistId,
      party: {
        participants: {
          some: {
            id: participantId,
            isActive: true,
            isBlocked: false,
          },
        },
      },
    },
    select: {
      id: true,
      partyId: true,
      quotaPerParticipant: true,
      isOpen: true,
      explicitContentAllowed: true,
      party: {
        select: {
          status: true,
          settings: {
            select: {
              maxTrackDurationMs: true,
              replayBlockMinutes: true,
            },
          },
        },
      },
    },
  });

  if (playlist === null) {
    throw new AppError(404, "PLAYLIST_NOT_FOUND", "Cette playlist n’existe pas.");
  }
  ensurePlaylistAcceptsTracks(playlist);

  const now = new Date();
  if (options.flashTurnId !== undefined) {
    const flashTurn = await transaction.flashTurn.findFirst({
      where: {
        id: options.flashTurnId,
        partyId: playlist.partyId,
        playlistId,
        participantId,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
      select: { id: true },
    });
    if (flashTurn === null) {
      throw new AppError(409, "FLASH_TURN_EXPIRED", "Ton tour Musique Flash est terminé.");
    }
  }
  const replayBlockMinutes =
    playlist.party.settings?.replayBlockMinutes ?? DEFAULT_REPLAY_BLOCK_MINUTES;
  const replayBlockStartsAt = new Date(now.getTime() - replayBlockMinutes * 60_000);
  const [samePlaylistTrack, bannedTrack, recentlyPlayedTracks, quota] = await Promise.all([
    transaction.playlistTrack.findUnique({
      where: {
        playlistId_spotifyTrackId: {
          playlistId,
          spotifyTrackId: spotifyTrack.spotifyTrackId,
        },
      },
      select: {
        spotifyTrackId: true,
        isBannedForParty: true,
      },
    }),
    transaction.playlistTrack.findFirst({
      where: {
        spotifyTrackId: spotifyTrack.spotifyTrackId,
        isBannedForParty: true,
        playlist: { partyId: playlist.partyId },
      },
      select: {
        spotifyTrackId: true,
        isBannedForParty: true,
      },
    }),
    transaction.playlistTrack.findMany({
      where: {
        spotifyTrackId: spotifyTrack.spotifyTrackId,
        status: "PLAYED",
        playedAt: { gte: replayBlockStartsAt },
        playlist: { partyId: playlist.partyId },
      },
      select: {
        spotifyTrackId: true,
        playedAt: true,
      },
    }),
    getQuotaSnapshot(transaction, playlist.partyId, playlistId, participantId),
  ]);

  const rejectionReason = findTrackRejectionReason({
    spotifyTrackId: spotifyTrack.spotifyTrackId,
    durationMs: spotifyTrack.durationMs,
    isExplicit: spotifyTrack.isExplicit,
    maxDurationMs: playlist.party.settings?.maxTrackDurationMs ?? DEFAULT_MAX_TRACK_DURATION_MS,
    explicitContentAllowed: playlist.explicitContentAllowed,
    playlistTracks: [bannedTrack, samePlaylistTrack].filter(
      (track): track is NonNullable<typeof track> => track !== null,
    ),
    recentlyPlayedTracks: recentlyPlayedTracks.flatMap((track) =>
      track.playedAt === null
        ? []
        : [{ spotifyTrackId: track.spotifyTrackId, playedAtMs: track.playedAt.getTime() }],
    ),
    replayBlockDurationMs: replayBlockMinutes * 60_000,
    nowMs: now.getTime(),
  });
  if (rejectionReason !== null) {
    throwTrackRejection(rejectionReason);
  }

  const baseContributionCount = quota.used - quota.rewardedTrackCount;
  const needsExtraTrackReward =
    options.bypassQuota !== true && baseContributionCount >= playlist.quotaPerParticipant;
  const reward = needsExtraTrackReward
    ? await transaction.reward.findFirst({
        where: {
          ...(input.rewardId === undefined ? {} : { id: input.rewardId }),
          partyId: playlist.partyId,
          participantId,
          type: "EXTRA_TRACK",
          status: "AVAILABLE",
          usesRemaining: { gt: 0 },
        },
        orderBy: { assignedAt: "asc" },
        select: {
          id: true,
          usesRemaining: true,
        },
      })
    : null;

  if (needsExtraTrackReward && reward === null) {
    throw new AppError(
      409,
      "TRACK_QUOTA_REACHED",
      "Tu as utilisé tous tes ajouts pour cette playlist.",
    );
  }

  if (reward !== null) {
    const remainingUses = reward.usesRemaining - 1;
    await transaction.reward.update({
      where: { id: reward.id },
      data: {
        usesRemaining: remainingUses,
        status: remainingUses === 0 ? "CONSUMED" : "AVAILABLE",
        lastUsedAt: now,
        ...(remainingUses === 0 ? { consumedAt: now } : {}),
      },
    });
  }

  const createdTrack = await transaction.playlistTrack.create({
    data: {
      playlistId,
      proposedByParticipantId: participantId,
      ...(reward === null ? {} : { rewardId: reward.id }),
      ...(options.flashTurnId === undefined ? {} : { priorityLevel: 100 }),
      ...spotifyTrack,
    },
    select: playlistTrackSelect,
  });
  if (options.flashTurnId !== undefined) {
    const submitted = await transaction.flashTurn.updateMany({
      where: {
        id: options.flashTurnId,
        status: "ACTIVE",
        expiresAt: { gt: now },
      },
      data: {
        status: "SUBMITTED",
        trackId: createdTrack.id,
        submittedAt: now,
      },
    });
    if (submitted.count === 0) {
      throw new AppError(409, "FLASH_TURN_EXPIRED", "Ton tour Musique Flash est terminé.");
    }
    await transaction.playbackState.updateMany({
      where: {
        partyId: playlist.partyId,
        lockedNextTrackId: null,
      },
      data: {
        lockedNextTrackId: createdTrack.id,
      },
    });
  }
  await transaction.party.update({
    where: { id: playlist.partyId },
    data: {
      stateVersion: { increment: 1 },
      auditLogs: {
        create: {
          actorType: "PARTICIPANT",
          participantActorId: participantId,
          action: options.flashTurnId === undefined ? "track.added" : "flash-track.submitted",
          entityType: "PlaylistTrack",
          entityId: createdTrack.id,
          metadata: {
            playlistId,
            usedExtraTrackReward: reward !== null,
            flashTurnId: options.flashTurnId ?? null,
          },
        },
      },
    },
  });

  const extraTrackUses = quota.rewardedTrackCount + quota.availableExtraTrackUses;
  const updatedQuota: ParticipantTrackQuota = {
    baseQuota: playlist.quotaPerParticipant,
    extraTrackUses,
    used: quota.used + (options.bypassQuota === true ? 0 : 1),
    remaining: calculateRemainingQuota({
      baseQuota: playlist.quotaPerParticipant,
      extraTrackUses,
      activeContributionCount: quota.used + (options.bypassQuota === true ? 0 : 1),
    }),
  };

  return {
    track: toParticipantPlaylistTrack(createdTrack),
    quota: updatedQuota,
  };
};

export const addPlaylistTrack = async (
  participantId: string,
  playlistId: string,
  input: AddTrackRequest,
) => {
  const playlist = await getParticipantPlaylist(participantId, playlistId);
  ensurePlaylistAcceptsTracks(playlist);
  const spotifyTrack = await getSpotifyTrackSnapshot(playlist.party.adminId, input.spotifyTrackId);

  try {
    return await runSerializableTransaction((transaction) =>
      createTrackInTransaction(transaction, participantId, playlistId, input, spotifyTrack),
    );
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "TRACK_ALREADY_EXISTS", "Ce morceau est déjà dans cette playlist.");
    }

    throw error;
  }
};

export const addFlashTrack = async (
  participantId: string,
  partyId: string,
  spotifyTrackId: string,
) => {
  const flashTurn = await prisma.flashTurn.findFirst({
    where: {
      partyId,
      participantId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
      participant: {
        isActive: true,
        isBlocked: false,
      },
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      playlistId: true,
      party: {
        select: {
          adminId: true,
        },
      },
    },
  });
  if (flashTurn === null) {
    throw new AppError(
      409,
      "FLASH_TURN_NOT_ACTIVE",
      "Tu n’as pas de Musique Flash à choisir maintenant.",
    );
  }

  const spotifyTrack = await getSpotifyTrackSnapshot(flashTurn.party.adminId, spotifyTrackId);

  try {
    return await runSerializableTransaction((transaction) =>
      createTrackInTransaction(
        transaction,
        participantId,
        flashTurn.playlistId,
        { spotifyTrackId },
        spotifyTrack,
        {
          bypassQuota: true,
          flashTurnId: flashTurn.id,
        },
      ),
    );
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "TRACK_ALREADY_EXISTS", "Ce morceau est déjà dans cette playlist.");
    }

    throw error;
  }
};
