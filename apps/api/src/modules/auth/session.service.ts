import type { CookieOptions, Response } from "express";

import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import {
  ADMIN_CSRF_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DURATION_MS,
  PARTICIPANT_CSRF_COOKIE,
  PARTICIPANT_SESSION_COOKIE,
  PARTICIPANT_SESSION_DURATION_MS,
} from "./auth.constants.js";
import { createOpaqueToken, hashOpaqueToken } from "./session-crypto.js";

interface SessionCookies {
  sessionCookie: string;
  csrfCookie: string;
  durationMs: number;
}

const secureCookie = env.NODE_ENV === "production";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: secureCookie,
  path: "/",
};

const actorCookies = {
  ADMIN: {
    sessionCookie: ADMIN_SESSION_COOKIE,
    csrfCookie: ADMIN_CSRF_COOKIE,
    durationMs: ADMIN_SESSION_DURATION_MS,
  },
  PARTICIPANT: {
    sessionCookie: PARTICIPANT_SESSION_COOKIE,
    csrfCookie: PARTICIPANT_CSRF_COOKIE,
    durationMs: PARTICIPANT_SESSION_DURATION_MS,
  },
} satisfies Record<"ADMIN" | "PARTICIPANT", SessionCookies>;

interface CreateSessionInput {
  actorType: "ADMIN" | "PARTICIPANT";
  adminId?: string;
  participantId?: string;
}

export const createSession = async (response: Response, input: CreateSessionInput) => {
  const token = createOpaqueToken();
  const csrfToken = createOpaqueToken();
  const cookieConfig = actorCookies[input.actorType];
  const expiresAt = new Date(Date.now() + cookieConfig.durationMs);

  await prisma.session.create({
    data: {
      actorType: input.actorType,
      tokenHash: hashOpaqueToken(token, env.SESSION_SECRET),
      csrfTokenHash: hashOpaqueToken(csrfToken, env.SESSION_SECRET),
      expiresAt,
      ...(input.adminId === undefined ? {} : { adminId: input.adminId }),
      ...(input.participantId === undefined ? {} : { participantId: input.participantId }),
    },
  });

  response.cookie(cookieConfig.sessionCookie, token, {
    ...baseCookieOptions,
    expires: expiresAt,
  });
  response.cookie(cookieConfig.csrfCookie, csrfToken, {
    ...baseCookieOptions,
    httpOnly: false,
    expires: expiresAt,
  });
};

export const clearSessionCookies = (response: Response, actorType: "ADMIN" | "PARTICIPANT") => {
  const cookieConfig = actorCookies[actorType];
  response.clearCookie(cookieConfig.sessionCookie, baseCookieOptions);
  response.clearCookie(cookieConfig.csrfCookie, {
    ...baseCookieOptions,
    httpOnly: false,
  });
};
