import { randomInt } from "node:crypto";

import {
  selectFlashParticipant,
  type FlashState,
  type FlashTurn,
  type SubmitFlashTrackRequest,
} from "@songfest/shared";

import { AppError } from "../../errors/app-error.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import {
  publishFlashCancelled,
  publishFlashExpired,
  publishFlashPlayed,
  publishFlashStarted,
  publishFlashSubmitted,
} from "../../socket/realtime-publisher.js";
import { addFlashTrack } from "../tracks/track.service.js";

const flashTurnSelect = {
  id: true,
  partyId: true,
  playlistId: true,
  status: true,
  startedAt: true,
  expiresAt: true,
  submittedAt: true,
  participant: {
    select: {
      id: true,
      nickname: true,
      avatarSeed: true,
    },
  },
  track: {
    select: {
      id: true,
      title: true,
      artistNames: true,
      coverUrl: true,
    },
  },
} as const;

type FlashTurnRecord = Awaited<
  ReturnType<typeof prisma.flashTurn.findFirst<{ select: typeof flashTurnSelect }>>
>;

const toFlashTurn = (turn: NonNullable<FlashTurnRecord>): FlashTurn => ({
  id: turn.id,
  partyId: turn.partyId,
  participant: turn.participant,
  playlistId: turn.playlistId,
  status: turn.status,
  startedAt: turn.startedAt.toISOString(),
  expiresAt: turn.expiresAt.toISOString(),
  submittedAt: turn.submittedAt?.toISOString() ?? null,
  track: turn.track,
});

const loadFlashState = async (
  partyId: string,
  currentParticipantId: string | null,
): Promise<FlashState> => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      settings: {
        select: {
          flashModeEnabled: true,
          flashIntervalMinutes: true,
          flashSelectionWindowSeconds: true,
          nextFlashTurnAt: true,
        },
      },
      flashTurns: {
        where: {
          status: { in: ["ACTIVE", "SUBMITTED"] },
        },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: flashTurnSelect,
      },
    },
  });
  if (party?.settings === null || party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
  }

  const turn = party.flashTurns[0];
  return {
    enabled: party.settings.flashModeEnabled,
    intervalMinutes: party.settings.flashIntervalMinutes,
    selectionWindowSeconds: party.settings.flashSelectionWindowSeconds,
    nextFlashTurnAt: party.settings.nextFlashTurnAt?.toISOString() ?? null,
    isCurrentParticipant:
      turn !== undefined &&
      currentParticipantId !== null &&
      turn.participant.id === currentParticipantId,
    turn: turn === undefined ? null : toFlashTurn(turn),
  };
};

const assertParticipantAccess = async (participantId: string, partyId: string) => {
  const participant = await prisma.participant.findFirst({
    where: {
      id: participantId,
      partyId,
      isActive: true,
      isBlocked: false,
    },
    select: { id: true },
  });
  if (participant === null) {
    throw new AppError(403, "FORBIDDEN", "Tu n’appartiens pas à cette soirée.");
  }
};

const assertAdminAccess = async (adminId: string, partyId: string) => {
  const party = await prisma.party.findFirst({
    where: { id: partyId, adminId },
    select: { id: true, status: true },
  });
  if (party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
  }
  return party;
};

export const getParticipantFlashState = async (participantId: string, partyId: string) => {
  await assertParticipantAccess(participantId, partyId);
  return loadFlashState(partyId, participantId);
};

export const getAdminFlashState = async (adminId: string, partyId: string) => {
  await assertAdminAccess(adminId, partyId);
  return loadFlashState(partyId, null);
};

const resolveCompletedTurn = async (partyId: string) => {
  const submitted = await prisma.flashTurn.findFirst({
    where: {
      partyId,
      status: "SUBMITTED",
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      track: {
        select: { status: true },
      },
    },
  });
  if (submitted?.track === null || submitted === null) {
    return false;
  }

  const resolvedStatus =
    submitted.track.status === "PLAYED"
      ? "PLAYED"
      : ["REMOVED", "SKIPPED"].includes(submitted.track.status)
        ? "CANCELLED"
        : null;
  if (resolvedStatus === null) {
    return true;
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.flashTurn.update({
      where: { id: submitted.id },
      data: {
        status: resolvedStatus,
        resolvedAt: now,
      },
    }),
    prisma.party.update({
      where: { id: partyId },
      data: {
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "SYSTEM",
            action: resolvedStatus === "PLAYED" ? "flash.played" : "flash.cancelled",
            entityType: "FlashTurn",
            entityId: submitted.id,
          },
        },
      },
    }),
  ]);

  if (resolvedStatus === "PLAYED") {
    void publishFlashPlayed(partyId, submitted.id);
  } else {
    void publishFlashCancelled(partyId, submitted.id);
  }
  return false;
};

const expireCurrentTurn = async (partyId: string, now: Date) => {
  const expired = await prisma.flashTurn.findFirst({
    where: {
      partyId,
      status: "ACTIVE",
      expiresAt: { lte: now },
    },
    select: { id: true },
  });
  if (expired === null) {
    return false;
  }

  await prisma.$transaction([
    prisma.flashTurn.update({
      where: { id: expired.id },
      data: {
        status: "EXPIRED",
        resolvedAt: now,
      },
    }),
    prisma.party.update({
      where: { id: partyId },
      data: {
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "SYSTEM",
            action: "flash.expired",
            entityType: "FlashTurn",
            entityId: expired.id,
          },
        },
      },
    }),
  ]);
  void publishFlashExpired(partyId, expired.id);
  return true;
};

export const synchronizeFlashTurnsForParty = async (partyId: string) => {
  const now = new Date();
  await expireCurrentTurn(partyId, now);
  const hasPendingSubmittedTurn = await resolveCompletedTurn(partyId);

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      status: true,
      activePlaylistId: true,
      settings: {
        select: {
          id: true,
          flashModeEnabled: true,
          flashIntervalMinutes: true,
          flashSelectionWindowSeconds: true,
          nextFlashTurnAt: true,
        },
      },
    },
  });
  if (party?.settings === null || party === null) {
    return;
  }

  if (!party.settings.flashModeEnabled || party.status !== "ACTIVE") {
    const cancelled = await prisma.flashTurn.findFirst({
      where: { partyId, status: "ACTIVE" },
      select: { id: true },
    });
    if (cancelled !== null) {
      await prisma.flashTurn.update({
        where: { id: cancelled.id },
        data: { status: "CANCELLED", resolvedAt: now },
      });
      void publishFlashCancelled(partyId, cancelled.id);
    }
    return;
  }

  if (party.settings.nextFlashTurnAt === null) {
    await prisma.partySettings.update({
      where: { id: party.settings.id },
      data: {
        nextFlashTurnAt: new Date(now.getTime() + party.settings.flashIntervalMinutes * 60_000),
      },
    });
    return;
  }

  const activeTurn = await prisma.flashTurn.findFirst({
    where: { partyId, status: "ACTIVE" },
    select: {
      id: true,
      participant: {
        select: {
          isActive: true,
          isBlocked: true,
        },
      },
    },
  });
  if (
    activeTurn !== null &&
    (!activeTurn.participant.isActive || activeTurn.participant.isBlocked)
  ) {
    await prisma.$transaction([
      prisma.flashTurn.update({
        where: { id: activeTurn.id },
        data: { status: "CANCELLED", resolvedAt: now },
      }),
      prisma.partySettings.update({
        where: { id: party.settings.id },
        data: { nextFlashTurnAt: now },
      }),
    ]);
    void publishFlashCancelled(partyId, activeTurn.id);
    return;
  }
  if (
    activeTurn !== null ||
    hasPendingSubmittedTurn ||
    party.activePlaylistId === null ||
    party.settings.nextFlashTurnAt.getTime() > now.getTime()
  ) {
    return;
  }

  const eligibleParticipants = await prisma.participant.findMany({
    where: {
      partyId,
      isActive: true,
      isBlocked: false,
    },
    orderBy: { joinedAt: "asc" },
    select: {
      id: true,
      nickname: true,
      avatarSeed: true,
    },
  });
  if (eligibleParticipants.length === 0) {
    await prisma.partySettings.update({
      where: { id: party.settings.id },
      data: {
        nextFlashTurnAt: new Date(now.getTime() + party.settings.flashIntervalMinutes * 60_000),
      },
    });
    return;
  }

  const recentTurns = await prisma.flashTurn.findMany({
    where: { partyId },
    orderBy: { startedAt: "desc" },
    take: Math.max(eligibleParticipants.length - 1, 0),
    select: { participantId: true },
  });
  const selectedParticipant = selectFlashParticipant({
    eligibleParticipants,
    recentWinnerIds: recentTurns.map((turn) => turn.participantId),
    randomValue: randomInt(1_000_000) / 1_000_000,
  });
  if (selectedParticipant === null) {
    return;
  }

  const expiresAt = new Date(now.getTime() + party.settings.flashSelectionWindowSeconds * 1_000);
  const nextFlashTurnAt = new Date(now.getTime() + party.settings.flashIntervalMinutes * 60_000);
  let turn: FlashTurn;
  try {
    turn = await prisma.$transaction(async (transaction) => {
      const created = await transaction.flashTurn.create({
        data: {
          partyId,
          participantId: selectedParticipant.id,
          playlistId: party.activePlaylistId!,
          expiresAt,
        },
        select: flashTurnSelect,
      });
      await transaction.partySettings.update({
        where: { id: party.settings!.id },
        data: { nextFlashTurnAt },
      });
      await transaction.party.update({
        where: { id: partyId },
        data: {
          stateVersion: { increment: 1 },
          auditLogs: {
            create: {
              actorType: "SYSTEM",
              action: "flash.started",
              entityType: "FlashTurn",
              entityId: created.id,
              metadata: {
                participantId: selectedParticipant.id,
                playlistId: party.activePlaylistId,
              },
            },
          },
        },
      });
      return toFlashTurn(created);
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return;
    }
    throw error;
  }

  void publishFlashStarted(turn);
};

export const submitParticipantFlashTrack = async (
  participantId: string,
  partyId: string,
  input: SubmitFlashTrackRequest,
) => {
  await assertParticipantAccess(participantId, partyId);
  const result = await addFlashTrack(participantId, partyId, input.spotifyTrackId);
  const state = await loadFlashState(partyId, participantId);
  if (state.turn !== null) {
    void publishFlashSubmitted(state.turn);
  }
  return {
    ...result,
    flash: state,
  };
};

export const triggerFlashTurn = async (adminId: string, partyId: string) => {
  const party = await assertAdminAccess(adminId, partyId);
  if (party.status !== "ACTIVE") {
    throw new AppError(
      409,
      "PLAYBACK_NOT_READY",
      "Lance la soirée avant de déclencher une Musique Flash.",
    );
  }

  const unresolved = await prisma.flashTurn.findFirst({
    where: {
      partyId,
      status: { in: ["ACTIVE", "SUBMITTED"] },
    },
    select: { id: true },
  });
  if (unresolved !== null) {
    throw new AppError(
      409,
      "FLASH_TURN_ALREADY_PENDING",
      "Une Musique Flash est déjà en cours ou attend d’être jouée.",
    );
  }

  await prisma.partySettings.update({
    where: { partyId },
    data: {
      flashModeEnabled: true,
      nextFlashTurnAt: new Date(),
    },
  });
  await synchronizeFlashTurnsForParty(partyId);
  return loadFlashState(partyId, null);
};

export const cancelFlashTurn = async (adminId: string, partyId: string) => {
  await assertAdminAccess(adminId, partyId);
  const turn = await prisma.flashTurn.findFirst({
    where: {
      partyId,
      status: { in: ["ACTIVE", "SUBMITTED"] },
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      trackId: true,
      track: {
        select: { status: true },
      },
    },
  });
  if (turn === null) {
    throw new AppError(409, "FLASH_TURN_NOT_ACTIVE", "Aucune Musique Flash n’est en cours.");
  }
  if (turn.track !== null && !["PENDING", "REMOVED"].includes(turn.track.status)) {
    throw new AppError(
      409,
      "FLASH_TURN_ALREADY_PENDING",
      "Ce morceau a déjà été envoyé à Spotify et ne peut plus être retiré de sa file.",
    );
  }

  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    if (turn.trackId !== null && turn.track?.status === "PENDING") {
      const removed = await transaction.playlistTrack.updateMany({
        where: {
          id: turn.trackId,
          status: "PENDING",
        },
        data: {
          status: "REMOVED",
          removedAt: now,
          removedReason: "Musique Flash annulée par l’organisateur.",
        },
      });
      if (removed.count === 0) {
        throw new AppError(
          409,
          "FLASH_TURN_ALREADY_PENDING",
          "Ce morceau est en cours de réservation et ne peut plus être annulé.",
        );
      }
      await transaction.playbackState.updateMany({
        where: {
          partyId,
          lockedNextTrackId: turn.trackId,
        },
        data: { lockedNextTrackId: null },
      });
    }
    await transaction.flashTurn.update({
      where: { id: turn.id },
      data: {
        status: "CANCELLED",
        resolvedAt: now,
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
            action: "flash.cancelled",
            entityType: "FlashTurn",
            entityId: turn.id,
          },
        },
      },
    });
  });

  void publishFlashCancelled(partyId, turn.id);
  return loadFlashState(partyId, null);
};
