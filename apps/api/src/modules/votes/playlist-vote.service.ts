import type { PlaylistChangeState, PlaylistVoteResult } from "@songfest/shared";
import { evaluatePlaylistChange } from "@songfest/shared";

import { AppError } from "../../errors/app-error.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { runSerializableTransaction } from "../../lib/serializable-transaction.js";

const DEFAULT_MINIMUM_VOTES = 4;
const DEFAULT_MINIMUM_PERCENTAGE = 40;
const DEFAULT_LOCK_MINUTES = 15;

interface PlaylistChangeParty {
  id: string;
  status: "DRAFT" | "OPEN" | "ACTIVE" | "ENDED";
  activePlaylistId: string | null;
  scheduledPlaylistId: string | null;
  activePlaylist: { activatedAt: Date | null } | null;
  settings: {
    minimumPlaylistVotes: number;
    minimumPlaylistVotePercentage: number;
    playlistLockMinutes: number;
    playlistVotesEnabled: boolean;
    playlistChangeLockedByAdmin: boolean;
  } | null;
  _count: { participants: number };
}

const toPlaylistChangeState = (
  party: PlaylistChangeParty,
  votesForPlaylist: number,
  nowMs: number,
  scheduledPlaylistId = party.scheduledPlaylistId,
): PlaylistChangeState => {
  const hasActivePlaylist = party.activePlaylistId !== null && party.activePlaylist !== null;
  const settings = party.settings;
  const votesEnabled =
    (settings?.playlistVotesEnabled ?? true) && hasActivePlaylist && scheduledPlaylistId === null;
  const lockedByAdmin = settings?.playlistChangeLockedByAdmin ?? false;
  const decision = evaluatePlaylistChange({
    activeParticipantCount: party._count.participants,
    votesForPlaylist,
    minimumAbsoluteVotes: settings?.minimumPlaylistVotes ?? DEFAULT_MINIMUM_VOTES,
    minimumPercentage: settings?.minimumPlaylistVotePercentage ?? DEFAULT_MINIMUM_PERCENTAGE,
    playlistActivatedAtMs: party.activePlaylist?.activatedAt?.getTime() ?? nowMs,
    lockDurationMs: (settings?.playlistLockMinutes ?? DEFAULT_LOCK_MINUTES) * 60_000,
    nowMs,
    votesEnabled,
    lockedByAdmin,
  });

  return {
    activeParticipantCount: party._count.participants,
    requiredVotes: decision.requiredVotes,
    remainingLockMs: decision.remainingLockMs,
    votesEnabled,
    lockedByAdmin,
    scheduledPlaylistId,
  };
};

const partyChangeSelect = {
  id: true,
  status: true,
  activePlaylistId: true,
  scheduledPlaylistId: true,
  activePlaylist: {
    select: {
      activatedAt: true,
    },
  },
  settings: {
    select: {
      minimumPlaylistVotes: true,
      minimumPlaylistVotePercentage: true,
      playlistLockMinutes: true,
      playlistVotesEnabled: true,
      playlistChangeLockedByAdmin: true,
    },
  },
  _count: {
    select: {
      participants: {
        where: {
          isActive: true,
          isBlocked: false,
        },
      },
    },
  },
} as const;

export const getPlaylistChangeState = async (participantId: string, partyId: string) => {
  const party = await prisma.party.findFirst({
    where: {
      id: partyId,
      participants: {
        some: {
          id: participantId,
          isActive: true,
          isBlocked: false,
        },
      },
    },
    select: partyChangeSelect,
  });
  if (party === null) {
    throw new AppError(403, "FORBIDDEN", "Tu n’appartiens pas à cette soirée.");
  }

  return toPlaylistChangeState(party, 0, Date.now());
};

const getVoteTarget = async (
  transaction: Prisma.TransactionClient,
  participantId: string,
  playlistId: string,
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
      party: {
        select: partyChangeSelect,
      },
    },
  });

  if (playlist === null) {
    throw new AppError(404, "PLAYLIST_NOT_FOUND", "Cette playlist n’existe pas.");
  }

  return playlist;
};

const ensurePlaylistVoteIsAllowed = (party: PlaylistChangeParty, playlistId: string) => {
  if (!["OPEN", "ACTIVE"].includes(party.status) || party.activePlaylistId === null) {
    throw new AppError(
      409,
      "PLAYLIST_CHANGE_LOCKED",
      "Aucune ambiance active ne peut encore être remplacée.",
    );
  }
  if (party.activePlaylistId === playlistId) {
    throw new AppError(409, "PLAYLIST_CHANGE_LOCKED", "Cette playlist est déjà active.");
  }
  if (party.scheduledPlaylistId !== null) {
    throw new AppError(
      409,
      "PLAYLIST_CHANGE_LOCKED",
      "Une prochaine ambiance est déjà programmée.",
    );
  }
  if (!(party.settings?.playlistVotesEnabled ?? true)) {
    throw new AppError(409, "PLAYLIST_VOTES_DISABLED", "Les votes de changement sont désactivés.");
  }
  if (party.settings?.playlistChangeLockedByAdmin ?? false) {
    throw new AppError(
      409,
      "PLAYLIST_CHANGE_LOCKED",
      "L’organisateur a verrouillé l’ambiance actuelle.",
    );
  }
};

export const addPlaylistVote = async (
  participantId: string,
  playlistId: string,
): Promise<PlaylistVoteResult> =>
  runSerializableTransaction(async (transaction) => {
    const target = await getVoteTarget(transaction, participantId, playlistId);
    const party = target.party;
    ensurePlaylistVoteIsAllowed(party, playlistId);

    const currentVote = await transaction.playlistVote.findUnique({
      where: { participantId },
      select: { playlistId: true },
    });
    const voteChanged = currentVote?.playlistId !== playlistId;

    if (currentVote === null) {
      await transaction.playlistVote.create({
        data: {
          partyId: party.id,
          playlistId,
          participantId,
        },
      });
    } else if (voteChanged) {
      await transaction.playlistVote.update({
        where: { participantId },
        data: {
          partyId: party.id,
          playlistId,
        },
      });
    }

    const voteCount = await transaction.playlistVote.count({
      where: {
        partyId: party.id,
        playlistId,
      },
    });
    const now = new Date();
    const decision = evaluatePlaylistChange({
      activeParticipantCount: party._count.participants,
      votesForPlaylist: voteCount,
      minimumAbsoluteVotes: party.settings?.minimumPlaylistVotes ?? DEFAULT_MINIMUM_VOTES,
      minimumPercentage:
        party.settings?.minimumPlaylistVotePercentage ?? DEFAULT_MINIMUM_PERCENTAGE,
      playlistActivatedAtMs: party.activePlaylist?.activatedAt?.getTime() ?? now.getTime(),
      lockDurationMs: (party.settings?.playlistLockMinutes ?? DEFAULT_LOCK_MINUTES) * 60_000,
      nowMs: now.getTime(),
      votesEnabled: party.settings?.playlistVotesEnabled ?? true,
      lockedByAdmin: party.settings?.playlistChangeLockedByAdmin ?? false,
    });
    const scheduledPlaylistId = decision.accepted ? playlistId : null;

    if (voteChanged || decision.accepted) {
      await transaction.party.update({
        where: { id: party.id },
        data: {
          ...(decision.accepted ? { scheduledPlaylistId: playlistId } : {}),
          stateVersion: { increment: 1 },
          auditLogs: {
            create: {
              actorType: "PARTICIPANT",
              participantActorId: participantId,
              action:
                currentVote === null
                  ? "playlist.vote-added"
                  : voteChanged
                    ? "playlist.vote-moved"
                    : "playlist.change-scheduled",
              entityType: "PartyPlaylist",
              entityId: playlistId,
            },
          },
        },
      });
    }

    return {
      playlistId,
      voteCount,
      participantHasVoted: true,
      change: toPlaylistChangeState(party, voteCount, now.getTime(), scheduledPlaylistId),
    };
  });

export const removePlaylistVote = async (
  participantId: string,
  playlistId: string,
): Promise<PlaylistVoteResult> =>
  runSerializableTransaction(async (transaction) => {
    const target = await getVoteTarget(transaction, participantId, playlistId);
    const party = target.party;
    const deleted = await transaction.playlistVote.deleteMany({
      where: {
        participantId,
        partyId: party.id,
        playlistId,
      },
    });

    if (deleted.count > 0) {
      await transaction.party.update({
        where: { id: party.id },
        data: {
          stateVersion: { increment: 1 },
          auditLogs: {
            create: {
              actorType: "PARTICIPANT",
              participantActorId: participantId,
              action: "playlist.vote-removed",
              entityType: "PartyPlaylist",
              entityId: playlistId,
            },
          },
        },
      });
    }

    const voteCount = await transaction.playlistVote.count({
      where: {
        partyId: party.id,
        playlistId,
      },
    });

    return {
      playlistId,
      voteCount,
      participantHasVoted: false,
      change: toPlaylistChangeState(party, voteCount, Date.now()),
    };
  });
