import type { TrackVoteResult } from "@songfest/shared";

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

const synchronizeTrackVoteCount = async (
  transaction: Prisma.TransactionClient,
  trackId: string,
) => {
  const voteCount = await transaction.trackVote.count({ where: { trackId } });
  await transaction.playlistTrack.update({
    where: { id: trackId },
    data: { voteCount },
  });
  return voteCount;
};

const recordVoteMutation = async (
  transaction: Prisma.TransactionClient,
  input: {
    partyId: string;
    participantId: string;
    trackId: string;
    action: "track.vote-added" | "track.vote-removed";
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
      select: { id: true },
    });

    if (existingVote === null) {
      await transaction.trackVote.create({
        data: {
          trackId,
          participantId,
        },
      });
      await recordVoteMutation(transaction, {
        partyId: track.playlist.party.id,
        participantId,
        trackId,
        action: "track.vote-added",
      });
    }

    return {
      trackId,
      voteCount: await synchronizeTrackVoteCount(transaction, trackId),
      participantHasVoted: true,
    };
  });

export const removeTrackVote = async (
  participantId: string,
  trackId: string,
): Promise<TrackVoteResult> =>
  runSerializableTransaction(async (transaction) => {
    const track = await getVotableTrack(transaction, participantId, trackId);
    const deleted = await transaction.trackVote.deleteMany({
      where: {
        trackId,
        participantId,
      },
    });

    if (deleted.count > 0) {
      await recordVoteMutation(transaction, {
        partyId: track.playlist.party.id,
        participantId,
        trackId,
        action: "track.vote-removed",
      });
    }

    return {
      trackId,
      voteCount: await synchronizeTrackVoteCount(transaction, trackId),
      participantHasVoted: false,
    };
  });
