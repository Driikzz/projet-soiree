import { randomBytes } from "node:crypto";

import type { CreatePartyRequest, JoinPartyRequest } from "@songfest/shared";

import { AppError } from "../../errors/app-error.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { generatePartyCode } from "./party-code.js";

const PARTY_CODE_ATTEMPTS = 8;

const toPartySummary = (party: {
  id: string;
  code: string;
  name: string;
  status: "DRAFT" | "OPEN" | "ACTIVE" | "ENDED";
  activePlaylistId: string | null;
  scheduledPlaylistId: string | null;
  stateVersion: number;
  createdAt: Date;
  _count: {
    participants: number;
  };
  selectedDeviceId: string | null;
}) => ({
  id: party.id,
  code: party.code,
  name: party.name,
  status: party.status,
  activePlaylistId: party.activePlaylistId,
  scheduledPlaylistId: party.scheduledPlaylistId,
  stateVersion: party.stateVersion,
  createdAt: party.createdAt.toISOString(),
  activeParticipantCount: party._count.participants,
  selectedDeviceId: party.selectedDeviceId,
});

const toPublicParty = (party: {
  id: string;
  code: string;
  name: string;
  status: "DRAFT" | "OPEN" | "ACTIVE" | "ENDED";
  activePlaylistId: string | null;
  scheduledPlaylistId: string | null;
  stateVersion: number;
}) => party;

const partySummarySelect = {
  id: true,
  code: true,
  name: true,
  status: true,
  activePlaylistId: true,
  scheduledPlaylistId: true,
  stateVersion: true,
  createdAt: true,
  selectedDeviceId: true,
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

const publicPartySelect = {
  id: true,
  code: true,
  name: true,
  status: true,
  activePlaylistId: true,
  scheduledPlaylistId: true,
  stateVersion: true,
} as const;

export const createParty = async (adminId: string, input: CreatePartyRequest) => {
  for (let attempt = 0; attempt < PARTY_CODE_ATTEMPTS; attempt += 1) {
    try {
      const party = await prisma.party.create({
        data: {
          adminId,
          name: input.name,
          code: generatePartyCode(),
          settings: { create: {} },
          playbackState: { create: {} },
          auditLogs: {
            create: {
              actorType: "ADMIN",
              adminActorId: adminId,
              action: "party.created",
              entityType: "Party",
            },
          },
        },
        select: partySummarySelect,
      });

      return toPartySummary(party);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }

      throw error;
    }
  }

  throw new AppError(
    503,
    "PARTY_CODE_UNAVAILABLE",
    "Impossible de générer un code de soirée. Réessaie.",
  );
};

export const listAdminParties = async (adminId: string) => {
  const parties = await prisma.party.findMany({
    where: { adminId },
    orderBy: { createdAt: "desc" },
    select: partySummarySelect,
  });

  return parties.map(toPartySummary);
};

export const getAdminParty = async (adminId: string, partyId: string) => {
  const party = await prisma.party.findFirst({
    where: { id: partyId, adminId },
    select: partySummarySelect,
  });

  if (party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
  }

  return toPartySummary(party);
};

export const openParty = async (adminId: string, partyId: string) => {
  const party = await prisma.party.findFirst({
    where: { id: partyId, adminId },
    select: { id: true, status: true },
  });

  if (party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
  }

  if (party.status === "ENDED") {
    throw new AppError(409, "PARTY_NOT_OPEN", "Une soirée terminée ne peut pas être rouverte.");
  }

  const updatedParty = await prisma.party.update({
    where: { id: party.id },
    data: {
      status: "OPEN",
      stateVersion: { increment: 1 },
      auditLogs: {
        create: {
          actorType: "ADMIN",
          adminActorId: adminId,
          action: "party.opened",
          entityType: "Party",
          entityId: party.id,
        },
      },
    },
    select: partySummarySelect,
  });

  return toPartySummary(updatedParty);
};

export const getPublicParty = async (partyCode: string) => {
  const party = await prisma.party.findUnique({
    where: { code: partyCode },
    select: publicPartySelect,
  });

  if (party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Ce code ne correspond à aucune soirée.");
  }

  return toPublicParty(party);
};

const normalizeNickname = (nickname: string) =>
  nickname.normalize("NFKC").trim().toLocaleLowerCase("fr-FR");

export const joinParty = async (partyCode: string, input: JoinPartyRequest) => {
  const party = await prisma.party.findUnique({
    where: { code: partyCode },
    select: publicPartySelect,
  });

  if (party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Ce code ne correspond à aucune soirée.");
  }

  if (party.status !== "OPEN" && party.status !== "ACTIVE") {
    throw new AppError(409, "PARTY_NOT_OPEN", "Cette soirée n’accepte pas encore de participants.");
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const createdParticipant = await transaction.participant.create({
        data: {
          partyId: party.id,
          nickname: input.nickname.trim(),
          normalizedNickname: normalizeNickname(input.nickname),
          avatarSeed: randomBytes(12).toString("hex"),
        },
        select: {
          id: true,
          partyId: true,
          nickname: true,
          avatarSeed: true,
        },
      });

      const updatedParty = await transaction.party.update({
        where: { id: party.id },
        data: {
          stateVersion: { increment: 1 },
          auditLogs: {
            create: {
              actorType: "PARTICIPANT",
              participantActorId: createdParticipant.id,
              action: "participant.joined",
              entityType: "Participant",
              entityId: createdParticipant.id,
            },
          },
        },
        select: publicPartySelect,
      });

      return { participant: createdParticipant, party: updatedParty };
    });

    return {
      participant: result.participant,
      party: toPublicParty(result.party),
    };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "NICKNAME_TAKEN", "Ce pseudo est déjà utilisé dans la soirée.");
    }

    throw error;
  }
};

export const getParticipantSession = async (participantId: string) => {
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      partyId: true,
      nickname: true,
      avatarSeed: true,
      party: { select: publicPartySelect },
    },
  });

  if (participant === null) {
    throw new AppError(401, "AUTHENTICATION_REQUIRED", "Ta session a expiré.");
  }

  const { party, ...participantSummary } = participant;
  return {
    participant: participantSummary,
    party: toPublicParty(party),
  };
};

export const listPartyPeople = async (participantId: string, partyId: string) => {
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, partyId, isActive: true, isBlocked: false },
    select: { id: true },
  });

  if (participant === null) {
    throw new AppError(403, "FORBIDDEN", "Tu n’appartiens pas à cette soirée.");
  }

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: {
      admin: { select: { displayName: true } },
      participants: {
        where: { isActive: true, isBlocked: false },
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          nickname: true,
          avatarSeed: true,
          _count: {
            select: { proposedTracks: { where: { status: { not: "REMOVED" } } } },
          },
        },
      },
    },
  });

  if (party === null) {
    throw new AppError(404, "PARTY_NOT_FOUND", "Cette soirée n’existe pas.");
  }

  return {
    host: party.admin,
    participants: party.participants.map((person) => ({
      id: person.id,
      nickname: person.nickname,
      avatarSeed: person.avatarSeed,
      contributionCount: person._count.proposedTracks,
      isCurrent: person.id === participantId,
    })),
  };
};
