import {
  calculateTrackPriorityScore,
  MAX_FLAMES_PER_TRACK,
  TRACK_FLAME_BUDGET,
  type TrackFlameBudget,
  type TrackVoteResult,
} from "@songfest/shared";

import { AppError } from "../../errors/app-error.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { runSerializableTransaction } from "../../lib/serializable-transaction.js";

const getVotableTrack = async (
  transaction: Prisma.TransactionClient,
  participantId: string,
  trackId: string,
) => {
  const track = await transaction.playlistTrack.findFirst({
    where: {
      id: trackId,
      playlist: {
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
    },
    select: {
      id: true,
      status: true,
      playlist: {
        select: {
          id: true,
          trackVotesEnabled: true,
          party: {
            select: {
              id: true,
              status: true,
              activePlaylistId: true,
              settings: {
                select: {
                  flameBudgetPerParticipant: true,
                },
              },
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
      },
    },
  });

  if (track === null) {
    throw new AppError(404, "TRACK_NOT_FOUND", "Ce morceau n’existe pas.");
  }
  if (
    !["OPEN", "ACTIVE"].includes(track.playlist.party.status) ||
    track.playlist.party.activePlaylistId !== track.playlist.id
  ) {
    throw new AppError(
      409,
      "TRACK_NOT_VOTABLE",
      "Les votes concernent uniquement la playlist active.",
    );
  }
  if (!track.playlist.trackVotesEnabled) {
    throw new AppError(
      409,
      "TRACK_VOTES_DISABLED",
      "Les votes sont désactivés pour cette playlist.",
    );
  }
  if (track.status !== "PENDING") {
    throw new AppError(409, "TRACK_NOT_VOTABLE", "Ce morceau n’est plus ouvert aux votes.");
  }

  return track;
};

const getFlameBudget = async (
  transaction: Prisma.TransactionClient,
  participantId: string,
  playlistId: string,
  totalFlames: number,
): Promise<TrackFlameBudget> => {
  const aggregate = await transaction.trackVote.aggregate({
    where: {
      participantId,
      track: { playlistId, status: "PENDING" },
    },
    _sum: { weight: true },
  });
  const used = aggregate._sum.weight ?? 0;

  return {
    total: totalFlames,
    used,
    remaining: Math.max(0, totalFlames - used),
    maxPerTrack: MAX_FLAMES_PER_TRACK,
  };
};

const synchronizeTrackVoteMetrics = async (
  transaction: Prisma.TransactionClient,
  trackId: string,
) => {
  const aggregate = await transaction.trackVote.aggregate({
    where: { trackId },
    _sum: { weight: true },
    _count: { id: true },
  });
  const voteCount = aggregate._sum.weight ?? 0;
  const voteSupporterCount = aggregate._count.id;
  await transaction.playlistTrack.update({
    where: { id: trackId },
    data: { voteCount, voteSupporterCount },
  });
  return { voteCount, voteSupporterCount };
};

export const clearParticipantTrackVotes = async (
  transaction: Prisma.TransactionClient,
  participantId: string,
) => {
  const votes = await transaction.trackVote.findMany({
    where: { participantId },
    select: { trackId: true },
  });
  if (votes.length === 0) {
    return;
  }

  await transaction.trackVote.deleteMany({ where: { participantId } });
  for (const vote of votes) {
    await synchronizeTrackVoteMetrics(transaction, vote.trackId);
  }
};

const recordVoteMutation = async (
  transaction: Prisma.TransactionClient,
  input: {
    partyId: string;
    participantId: string;
    trackId: string;
    action: "track.flame-added" | "track.flame-removed";
    participantFlameCount: number;
  },
) => {
  await transaction.party.update({
    where: { id: input.partyId },
    data: {
      stateVersion: { increment: 1 },
      auditLogs: {
        create: {
          actorType: "PARTICIPANT",
          participantActorId: input.participantId,
          action: input.action,
          entityType: "PlaylistTrack",
          entityId: input.trackId,
          metadata: { participantFlameCount: input.participantFlameCount },
        },
      },
    },
  });
};

export const addTrackVote = async (
  participantId: string,
  trackId: string,
): Promise<TrackVoteResult> =>
  runSerializableTransaction(async (transaction) => {
    const track = await getVotableTrack(transaction, participantId, trackId);
    const existingVote = await transaction.trackVote.findUnique({
      where: {
        trackId_participantId: {
          trackId,
          participantId,
        },
      },
      select: { id: true, weight: true },
    });
    const totalFlames =
      track.playlist.party.settings?.flameBudgetPerParticipant ?? TRACK_FLAME_BUDGET;
    const flameBudget = await getFlameBudget(
      transaction,
      participantId,
      track.playlist.id,
      totalFlames,
    );

    if (existingVote?.weight === MAX_FLAMES_PER_TRACK) {
      throw new AppError(
        409,
        "TRACK_FLAME_LIMIT_REACHED",
        `Tu peux placer au maximum ${MAX_FLAMES_PER_TRACK} flammes sur un morceau.`,
      );
    }
    if (flameBudget.remaining === 0) {
      throw new AppError(
        409,
        "TRACK_FLAME_BUDGET_EXHAUSTED",
        "Tu as distribué toutes tes flammes. Retire-en une pour la déplacer.",
      );
    }

    const participantFlameCount = (existingVote?.weight ?? 0) + 1;
    if (existingVote === null) {
      await transaction.trackVote.create({
        data: {
          trackId,
          participantId,
          weight: participantFlameCount,
        },
      });
    } else {
      await transaction.trackVote.update({
        where: { id: existingVote.id },
        data: { weight: participantFlameCount },
      });
    }
    await recordVoteMutation(transaction, {
      partyId: track.playlist.party.id,
      participantId,
      trackId,
      action: "track.flame-added",
      participantFlameCount,
    });

    const metrics = await synchronizeTrackVoteMetrics(transaction, trackId);
    const updatedBudget = await getFlameBudget(
      transaction,
      participantId,
      track.playlist.id,
      totalFlames,
    );

    return {
      trackId,
      ...metrics,
      participantHasVoted: true,
      participantFlameCount,
      voteScore: calculateTrackPriorityScore(
        metrics.voteSupporterCount,
        metrics.voteCount,
        track.playlist.party._count.participants,
      ),
      flameBudget: updatedBudget,
    };
  });

export const removeTrackVote = async (
  participantId: string,
  trackId: string,
): Promise<TrackVoteResult> =>
  runSerializableTransaction(async (transaction) => {
    const track = await getVotableTrack(transaction, participantId, trackId);
    const existingVote = await transaction.trackVote.findUnique({
      where: { trackId_participantId: { trackId, participantId } },
      select: { id: true, weight: true },
    });

    const participantFlameCount = Math.max(0, (existingVote?.weight ?? 0) - 1);
    if (existingVote !== null) {
      if (participantFlameCount === 0) {
        await transaction.trackVote.delete({ where: { id: existingVote.id } });
      } else {
        await transaction.trackVote.update({
          where: { id: existingVote.id },
          data: { weight: participantFlameCount },
        });
      }
      await recordVoteMutation(transaction, {
        partyId: track.playlist.party.id,
        participantId,
        trackId,
        action: "track.flame-removed",
        participantFlameCount,
      });
    }

    const metrics = await synchronizeTrackVoteMetrics(transaction, trackId);
    const flameBudget = await getFlameBudget(
      transaction,
      participantId,
      track.playlist.id,
      track.playlist.party.settings?.flameBudgetPerParticipant ?? TRACK_FLAME_BUDGET,
    );

    return {
      trackId,
      ...metrics,
      participantHasVoted: participantFlameCount > 0,
      participantFlameCount,
      voteScore: calculateTrackPriorityScore(
        metrics.voteSupporterCount,
        metrics.voteCount,
        track.playlist.party._count.participants,
      ),
      flameBudget,
    };
  });
