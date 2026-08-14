import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import {
  disconnectPartyParticipantSockets,
  publishPartyEnded,
} from "../../socket/realtime-publisher.js";

export const PARTY_INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1_000;

type PartyEndActor =
  | { actorType: "ADMIN"; adminActorId: string }
  | { actorType: "SYSTEM"; reason: "PLAYBACK_INACTIVE" | "REPLACED_BY_NEW_PARTY" };

export const isPartyInactive = (
  startedAt: Date | null,
  lastPlaybackActivityAt: Date | null,
  now = new Date(),
) => {
  const latestActivity = lastPlaybackActivityAt ?? startedAt;
  return (
    latestActivity !== null &&
    latestActivity.getTime() <= now.getTime() - PARTY_INACTIVITY_TIMEOUT_MS
  );
};

export const closeParty = async (partyId: string, actor: PartyEndActor) => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { status: true, endedAt: true },
  });
  if (party === null) {
    return null;
  }
  if (party.status === "ENDED") {
    return { id: partyId, endedAt: party.endedAt ?? new Date(), closed: false };
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
    prisma.playbackState.update({
      where: { partyId },
      data: { isPlaying: false },
    }),
    prisma.party.update({
      where: { id: partyId },
      data: {
        status: "ENDED",
        endedAt,
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: actor.actorType,
            ...(actor.actorType === "ADMIN" ? { adminActorId: actor.adminActorId } : {}),
            action:
              actor.actorType === "ADMIN"
                ? "party.ended"
                : actor.reason === "PLAYBACK_INACTIVE"
                  ? "party.auto-ended-inactive"
                  : "party.auto-ended-replaced",
            entityType: "Party",
            entityId: partyId,
            ...(actor.actorType === "SYSTEM" ? { metadata: { reason: actor.reason } } : {}),
          },
        },
      },
    }),
  ]);

  await publishPartyEnded(partyId, endedAt);
  disconnectPartyParticipantSockets(partyId);
  return { id: partyId, endedAt, closed: true };
};

export const closeInactiveParties = async (now = new Date()) => {
  const cutoff = new Date(now.getTime() - PARTY_INACTIVITY_TIMEOUT_MS);
  const inactiveParties = await prisma.party.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        {
          playbackState: {
            is: { lastPlaybackActivityAt: { lte: cutoff } },
          },
        },
        {
          startedAt: { lte: cutoff },
          playbackState: {
            is: { lastPlaybackActivityAt: null },
          },
        },
      ],
    },
    select: { id: true },
  });

  const results = await Promise.allSettled(
    inactiveParties.map((party) =>
      closeParty(party.id, { actorType: "SYSTEM", reason: "PLAYBACK_INACTIVE" }),
    ),
  );
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.warn(
        { partyId: inactiveParties[index]?.id, error: result.reason },
        "Inactive party closure failed",
      );
    }
  });

  return inactiveParties.length;
};
