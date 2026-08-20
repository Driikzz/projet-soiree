import type { RequestHandler } from "express";

import { AppError } from "../../errors/app-error.js";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { isTrustedOrigin } from "../../lib/trusted-origin.js";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_SESSION_COOKIE,
  PARTICIPANT_CSRF_COOKIE,
  PARTICIPANT_SESSION_COOKIE,
} from "./auth.constants.js";
import { hashOpaqueToken, tokenMatchesHash } from "./session-crypto.js";

export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get("origin");

  if (
    !isTrustedOrigin({
      origin,
      host: request.get("x-forwarded-host") ?? request.get("host"),
      protocol: request.get("x-forwarded-proto") ?? request.protocol,
      configuredOrigin: env.WEB_ORIGIN,
    })
  ) {
    next(new AppError(403, "FORBIDDEN", "Origine de la requête refusée."));
    return;
  }

  next();
};

export const requireAdmin: RequestHandler = async (request, _response, next) => {
  const token = request.cookies[ADMIN_SESSION_COOKIE] as string | undefined;
  if (token === undefined) {
    next(new AppError(401, "AUTHENTICATION_REQUIRED", "Connecte-toi pour continuer."));
    return;
  }

  const session = await prisma.session.findFirst({
    where: {
      tokenHash: hashOpaqueToken(token, env.SESSION_SECRET),
      actorType: "ADMIN",
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      csrfTokenHash: true,
      admin: {
        select: { id: true, username: true, displayName: true, email: true },
      },
    },
  });

  if (session?.admin === null || session === null) {
    next(new AppError(401, "AUTHENTICATION_REQUIRED", "Ta session a expiré."));
    return;
  }

  request.adminAuth = {
    sessionId: session.id,
    csrfTokenHash: session.csrfTokenHash,
    admin: session.admin,
  };
  next();
};

export const requireParticipant: RequestHandler = async (request, _response, next) => {
  const token = request.cookies[PARTICIPANT_SESSION_COOKIE] as string | undefined;
  if (token === undefined) {
    next(new AppError(401, "AUTHENTICATION_REQUIRED", "Rejoins une soirée pour continuer."));
    return;
  }

  const session = await prisma.session.findFirst({
    where: {
      tokenHash: hashOpaqueToken(token, env.SESSION_SECRET),
      actorType: "PARTICIPANT",
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      csrfTokenHash: true,
      participant: {
        select: {
          id: true,
          partyId: true,
          nickname: true,
          avatarSeed: true,
          isBlocked: true,
        },
      },
    },
  });

  if (session?.participant === null || session === null) {
    next(new AppError(401, "AUTHENTICATION_REQUIRED", "Ta session a expiré."));
    return;
  }

  if (session.participant.isBlocked) {
    next(new AppError(403, "PARTICIPANT_BLOCKED", "Tu ne peux plus participer à cette soirée."));
    return;
  }

  request.participantAuth = {
    sessionId: session.id,
    csrfTokenHash: session.csrfTokenHash,
    participant: session.participant,
  };
  next();
};

const requireCsrf =
  (cookieName: string, authentication: "adminAuth" | "participantAuth"): RequestHandler =>
  (request, _response, next) => {
    const token = request.get("x-csrf-token");
    const cookieToken = request.cookies[cookieName] as string | undefined;
    const auth = request[authentication];

    if (
      token === undefined ||
      cookieToken === undefined ||
      token !== cookieToken ||
      auth === undefined ||
      !tokenMatchesHash(token, auth.csrfTokenHash, env.SESSION_SECRET)
    ) {
      next(new AppError(403, "INVALID_CSRF_TOKEN", "La requête de sécurité a expiré."));
      return;
    }

    next();
  };

export const requireAdminCsrf = requireCsrf(ADMIN_CSRF_COOKIE, "adminAuth");
export const requireParticipantCsrf = requireCsrf(PARTICIPANT_CSRF_COOKIE, "participantAuth");
