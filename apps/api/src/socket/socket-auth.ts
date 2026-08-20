import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { isTrustedOrigin } from "../lib/trusted-origin.js";
import {
  ADMIN_SESSION_COOKIE,
  PARTICIPANT_SESSION_COOKIE,
} from "../modules/auth/auth.constants.js";
import { hashOpaqueToken } from "../modules/auth/session-crypto.js";
import type { SocketIdentity } from "./socket.types.js";

export const parseCookieHeader = (header: string | undefined): ReadonlyMap<string, string> => {
  const cookies = new Map<string, string>();

  for (const part of header?.split(";") ?? []) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }

    const name = part.slice(0, separatorIndex).trim();
    const rawValue = part.slice(separatorIndex + 1).trim();
    try {
      cookies.set(name, decodeURIComponent(rawValue));
    } catch {
      continue;
    }
  }

  return cookies;
};

export const isTrustedSocketOrigin = (origin: string | undefined) => {
  return isTrustedOrigin({
    origin,
    host: undefined,
    protocol: undefined,
    configuredOrigin: env.WEB_ORIGIN,
  });
};

export const isTrustedSocketRequestOrigin = ({
  origin,
  host,
  forwardedHost,
  forwardedProtocol,
  encrypted,
}: {
  origin: string | undefined;
  host: string | undefined;
  forwardedHost: string | undefined;
  forwardedProtocol: string | undefined;
  encrypted: boolean;
}) =>
  isTrustedOrigin({
    origin,
    host: forwardedHost ?? host,
    protocol: forwardedProtocol ?? (encrypted ? "https" : "http"),
    configuredOrigin: env.WEB_ORIGIN,
  });

export const loadSocketIdentity = async (
  cookieHeader: string | undefined,
): Promise<SocketIdentity | null> => {
  const cookies = parseCookieHeader(cookieHeader);
  const adminToken = cookies.get(ADMIN_SESSION_COOKIE);
  const participantToken = cookies.get(PARTICIPANT_SESSION_COOKIE);
  const tokenHashes = [adminToken, participantToken]
    .filter((token): token is string => token !== undefined)
    .map((token) => hashOpaqueToken(token, env.SESSION_SECRET));

  if (tokenHashes.length === 0) {
    return null;
  }

  const sessions = await prisma.session.findMany({
    where: {
      tokenHash: { in: tokenHashes },
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      actorType: true,
      admin: { select: { id: true } },
      participant: {
        select: {
          id: true,
          partyId: true,
          isActive: true,
          isBlocked: true,
        },
      },
    },
  });

  const adminSession = sessions.find(
    (session) => session.actorType === "ADMIN" && session.admin !== null,
  );
  const participantSession = sessions.find(
    (session) =>
      session.actorType === "PARTICIPANT" &&
      session.participant !== null &&
      session.participant.isActive &&
      !session.participant.isBlocked,
  );

  const adminId = adminSession?.admin?.id ?? null;
  const participant = participantSession?.participant;
  if (adminId === null && (participant === undefined || participant === null)) {
    return null;
  }

  return {
    adminId,
    participant:
      participant === undefined || participant === null
        ? null
        : { id: participant.id, partyId: participant.partyId },
  };
};

export const canSubscribeToParty = async (identity: SocketIdentity, partyId: string) => {
  if (identity.adminId === null && identity.participant?.partyId !== partyId) {
    return false;
  }

  const accessibleParty = await prisma.party.findFirst({
    where: {
      id: partyId,
      OR: [
        ...(identity.adminId === null ? [] : [{ adminId: identity.adminId }]),
        ...(identity.participant?.partyId !== partyId
          ? []
          : [
              {
                participants: {
                  some: {
                    id: identity.participant.id,
                    isActive: true,
                    isBlocked: false,
                  },
                },
              },
            ]),
      ],
    },
    select: { id: true },
  });

  return accessibleParty !== null;
};
