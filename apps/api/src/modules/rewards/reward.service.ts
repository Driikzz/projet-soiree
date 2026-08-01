import { randomUUID } from "node:crypto";

import type { AssignRewardRequest, Reward, UseRewardRequest } from "@songfest/shared";

import { AppError } from "../../errors/app-error.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { runSerializableTransaction } from "../../lib/serializable-transaction.js";

interface RewardRecord {
  id: string;
  partyId: string;
  participantId: string;
  type: "EXTRA_TRACK" | "PRIORITY_TRACK" | "DOUBLE_TRACK" | "CHOOSE_NEXT_PLAYLIST";
  status: "AVAILABLE" | "CONSUMED" | "REVOKED";
  usesGranted: number;
  usesRemaining: number;
  assignedAt: Date;
  lastUsedAt: Date | null;
}

export const toReward = (reward: RewardRecord): Reward => ({
  id: reward.id,
  partyId: reward.partyId,
  participantId: reward.participantId,
  type: reward.type,
  status: reward.status,
  usesGranted: reward.usesGranted,
  usesRemaining: reward.usesRemaining,
  assignedAt: reward.assignedAt.toISOString(),
  lastUsedAt: reward.lastUsedAt?.toISOString() ?? null,
});

const rewardSelect = {
  id: true,
  partyId: true,
  participantId: true,
  type: true,
  status: true,
  usesGranted: true,
  usesRemaining: true,
  assignedAt: true,
  lastUsedAt: true,
} as const;

export const assignReward = async (adminId: string, input: AssignRewardRequest) => {
  const participant = await prisma.participant.findFirst({
    where: {
      id: input.participantId,
      partyId: input.partyId,
      isBlocked: false,
      party: { adminId },
    },
    select: { id: true },
  });
  if (participant === null) {
    throw new AppError(404, "PARTICIPANT_NOT_FOUND", "Ce participant n’existe pas.");
  }

  const reward = await prisma.$transaction(async (transaction) => {
    const createdReward = await transaction.reward.create({
      data: {
        partyId: input.partyId,
        participantId: input.participantId,
        assignedById: adminId,
        type: input.type,
        usesGranted: input.uses,
        usesRemaining: input.uses,
      },
      select: rewardSelect,
    });
    await transaction.party.update({
      where: { id: input.partyId },
      data: {
        stateVersion: { increment: 1 },
        auditLogs: {
          create: {
            actorType: "ADMIN",
            adminActorId: adminId,
            action: "reward.assigned",
            entityType: "Reward",
            entityId: createdReward.id,
            metadata: { type: input.type, uses: input.uses },
          },
        },
      },
    });
    return createdReward;
  });

  return toReward(reward);
};

export const listParticipantRewards = async (participantId: string) => {
  const participant = await prisma.participant.findFirst({
    where: {
      id: participantId,
      isActive: true,
      isBlocked: false,
    },
    select: { id: true },
  });
  if (participant === null) {
    throw new AppError(403, "PARTICIPANT_BLOCKED", "Tu ne peux plus utiliser de récompense.");
  }

  const rewards = await prisma.reward.findMany({
    where: { participantId },
    orderBy: { assignedAt: "desc" },
    select: rewardSelect,
  });
  return rewards.map(toReward);
};

const getRewardForUse = async (
  transaction: Prisma.TransactionClient,
  participantId: string,
  rewardId: string,
) => {
  const reward = await transaction.reward.findFirst({
    where: {
      id: rewardId,
      participantId,
      status: "AVAILABLE",
      usesRemaining: { gt: 0 },
      participant: {
        isActive: true,
        isBlocked: false,
      },
      party: {
        status: { in: ["OPEN", "ACTIVE"] },
      },
    },
    select: {
      ...rewardSelect,
      party: {
        select: {
          activePlaylistId: true,
          scheduledPlaylistId: true,
        },
      },
    },
  });
  if (reward === null) {
    throw new AppError(409, "REWARD_NOT_AVAILABLE", "Cette récompense n’est plus disponible.");
  }

  return reward;
};

const consumeReward = async (
  transaction: Prisma.TransactionClient,
  reward: RewardRecord,
  participantId: string,
) => {
  const now = new Date();
  const usesRemaining = reward.usesRemaining - 1;
  await transaction.reward.update({
    where: { id: reward.id },
    data: {
      usesRemaining,
      status: usesRemaining === 0 ? "CONSUMED" : "AVAILABLE",
      lastUsedAt: now,
      ...(usesRemaining === 0 ? { consumedAt: now } : {}),
    },
  });
  await transaction.party.update({
    where: { id: reward.partyId },
    data: {
      stateVersion: { increment: 1 },
      auditLogs: {
        create: {
          actorType: "PARTICIPANT",
          participantActorId: participantId,
          action: "reward.used",
          entityType: "Reward",
          entityId: reward.id,
          metadata: { type: reward.type },
        },
      },
    },
  });
};

const getOwnedPendingTracks = async (
  transaction: Prisma.TransactionClient,
  participantId: string,
  partyId: string,
  activePlaylistId: string | null,
  trackIds: readonly string[],
) => {
  if (activePlaylistId === null) {
    throw new AppError(409, "PLAYBACK_NOT_READY", "Aucune playlist n’est active.");
  }

  const tracks = await transaction.playlistTrack.findMany({
    where: {
      id: { in: [...trackIds] },
      playlistId: activePlaylistId,
      proposedByParticipantId: participantId,
      status: "PENDING",
      playlist: { partyId },
      rewardId: null,
    },
    select: { id: true },
  });
  if (tracks.length !== trackIds.length) {
    throw new AppError(
      409,
      "REWARD_NOT_AVAILABLE",
      "Choisis uniquement tes morceaux en attente dans la playlist active.",
    );
  }
};

export const useReward = async (participantId: string, input: UseRewardRequest) =>
  runSerializableTransaction(async (transaction) => {
    const reward = await getRewardForUse(transaction, participantId, input.rewardId);

    if (reward.type === "EXTRA_TRACK") {
      throw new AppError(
        409,
        "REWARD_NOT_AVAILABLE",
        "Le bonus d’ajout sera utilisé automatiquement lorsque ton quota sera plein.",
      );
    }

    if (reward.type === "CHOOSE_NEXT_PLAYLIST") {
      if (
        input.playlistId === undefined ||
        input.trackIds !== undefined ||
        reward.party.activePlaylistId === input.playlistId ||
        reward.party.scheduledPlaylistId !== null
      ) {
        throw new AppError(
          409,
          "REWARD_NOT_AVAILABLE",
          "Choisis une playlist disponible qui n’est pas déjà programmée.",
        );
      }

      const playlist = await transaction.partyPlaylist.findFirst({
        where: {
          id: input.playlistId,
          partyId: reward.partyId,
          isOpen: true,
        },
        select: { id: true },
      });
      if (playlist === null) {
        throw new AppError(404, "PLAYLIST_NOT_FOUND", "Cette playlist n’est pas disponible.");
      }

      await transaction.party.update({
        where: { id: reward.partyId },
        data: { scheduledPlaylistId: playlist.id },
      });
      await consumeReward(transaction, reward, participantId);
      return {
        rewardId: reward.id,
        partyId: reward.partyId,
        playlistId: playlist.id,
        trackIds: [],
      };
    }

    const requiredTrackCount = reward.type === "DOUBLE_TRACK" ? 2 : 1;
    const trackIds = [...new Set(input.trackIds ?? [])];
    if (
      input.playlistId !== undefined ||
      trackIds.length !== requiredTrackCount ||
      trackIds.length !== (input.trackIds?.length ?? 0)
    ) {
      throw new AppError(
        409,
        "REWARD_NOT_AVAILABLE",
        reward.type === "DOUBLE_TRACK"
          ? "Choisis deux morceaux différents dans l’ordre souhaité."
          : "Choisis un morceau en attente.",
      );
    }

    await getOwnedPendingTracks(
      transaction,
      participantId,
      reward.partyId,
      reward.party.activePlaylistId,
      trackIds,
    );

    if (reward.type === "PRIORITY_TRACK") {
      await transaction.playlistTrack.update({
        where: { id: trackIds[0]! },
        data: {
          rewardId: reward.id,
          priorityLevel: 1,
        },
      });
    } else {
      const sequenceGroupId = randomUUID();
      await Promise.all(
        trackIds.map((trackId, index) =>
          transaction.playlistTrack.update({
            where: { id: trackId },
            data: {
              rewardId: reward.id,
              sequenceGroupId,
              sequencePosition: index + 1,
              priorityLevel: index === 0 ? 2 : 0,
            },
          }),
        ),
      );
    }

    await consumeReward(transaction, reward, participantId);
    return { rewardId: reward.id, partyId: reward.partyId, trackIds, playlistId: null };
  });
