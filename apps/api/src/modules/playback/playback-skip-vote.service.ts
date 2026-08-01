import { calculateRequiredSkipVotes } from "@songfest/shared";

import { AppError } from "../../errors/app-error.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { runSerializableTransaction } from "../../lib/serializable-transaction.js";
import { getParticipantPlayback, skipPartyPlaybackAfterVote } from "./playback.service.js";

const loadVotingContext = async (
  transaction: Prisma.TransactionClient,
  participantId: string,
  partyId: string,
) => {
  const [participant, party] = await Promise.all([
    transaction.participant.findFirst({
      where: { id: participantId, partyId, isActive: true, isBlocked: false },
      select: { id: true },
    }),
    transaction.party.findUnique({
      where: { id: partyId },
      select: {
        status: true,
        playbackState: { select: { currentTrackId: true } },
        _count: {
          select: {
            participants: { where: { isActive: true, isBlocked: false } },
          },
        },
      },
    }),
  ]);

  if (participant === null) {
    throw new AppError(403, "FORBIDDEN", "Tu n’appartiens pas à cette soirée.");
  }
  if (party === null || party.status !== "ACTIVE") {
    throw new AppError(409, "PLAYBACK_NOT_READY", "La soirée n’est pas encore lancée.");
  }
  if (party.playbackState?.currentTrackId === null || party.playbackState === null) {
    throw new AppError(409, "PLAYBACK_NOT_READY", "Aucun morceau ne peut être passé maintenant.");
  }

  return {
    currentTrackId: party.playbackState.currentTrackId,
    requiredVotes: calculateRequiredSkipVotes(party._count.participants),
  };
};

export const addPlaybackSkipVote = async (participantId: string, partyId: string) => {
  const vote = await runSerializableTransaction(async (transaction) => {
    const context = await loadVotingContext(transaction, participantId, partyId);
    await transaction.trackSkipVote.upsert({
      where: {
        trackId_participantId: {
          trackId: context.currentTrackId,
          participantId,
        },
      },
      update: {},
      create: {
        partyId,
        trackId: context.currentTrackId,
        participantId,
      },
    });
    const voteCount = await transaction.trackSkipVote.count({
      where: {
        partyId,
        trackId: context.currentTrackId,
        participant: { isActive: true, isBlocked: false },
      },
    });
    await transaction.party.update({
      where: { id: partyId },
      data: {
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "PARTICIPANT",
            participantActorId: participantId,
            action: "playback.skip-vote-added",
            entityType: "PlaylistTrack",
            entityId: context.currentTrackId,
          },
        },
      },
    });

    return { ...context, voteCount };
  });

  if (vote.voteCount >= vote.requiredVotes) {
    await skipPartyPlaybackAfterVote(partyId, vote.currentTrackId, participantId);
  }

  return {
    playback: await getParticipantPlayback(participantId, partyId),
    updatedTrackId: vote.currentTrackId,
  };
};

export const removePlaybackSkipVote = async (participantId: string, partyId: string) => {
  const vote = await runSerializableTransaction(async (transaction) => {
    const context = await loadVotingContext(transaction, participantId, partyId);
    const removed = await transaction.trackSkipVote.deleteMany({
      where: {
        trackId: context.currentTrackId,
        participantId,
      },
    });
    const voteCount = await transaction.trackSkipVote.count({
      where: {
        partyId,
        trackId: context.currentTrackId,
        participant: { isActive: true, isBlocked: false },
      },
    });
    if (removed.count > 0) {
      await transaction.party.update({
        where: { id: partyId },
        data: {
          stateVersion: { increment: 1 },
          auditLogs: {
            create: {
              actorType: "PARTICIPANT",
              participantActorId: participantId,
              action: "playback.skip-vote-removed",
              entityType: "PlaylistTrack",
              entityId: context.currentTrackId,
            },
          },
        },
      });
    }

    return { ...context, voteCount };
  });

  return {
    playback: await getParticipantPlayback(participantId, partyId),
    updatedTrackId: vote.currentTrackId,
  };
};
