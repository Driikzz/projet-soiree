import type { Server as HttpServer } from "node:http";
import { TLSSocket } from "node:tls";

import {
  partySocketPayloadSchema,
  type RealtimeResource,
  type SocketActionResult,
} from "@songfest/shared";
import { Server } from "socket.io";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import {
  canSubscribeToParty,
  isTrustedSocketRequestOrigin,
  loadSocketIdentity,
} from "./socket-auth.js";
import { getPartyRoom } from "./party-room.js";
import { registerRealtimePublisher } from "./realtime-publisher.js";
import { consumeSocketAction } from "./socket-rate-limit.js";
import type { RotateSocketServer } from "./socket.types.js";

const invalidPayload: SocketActionResult = {
  ok: false,
  error: {
    code: "INVALID_PAYLOAD",
    message: "La demande temps réel est invalide.",
  },
};

const forbidden: SocketActionResult = {
  ok: false,
  error: {
    code: "FORBIDDEN",
    message: "Tu n’as pas accès à cette soirée.",
  },
};

const rateLimited: SocketActionResult = {
  ok: false,
  error: {
    code: "RATE_LIMITED",
    message: "Trop de demandes temps réel. Réessaie dans un instant.",
  },
};

const reply = (
  acknowledge: ((result: SocketActionResult) => void) | undefined,
  result: SocketActionResult,
) => {
  if (typeof acknowledge === "function") {
    acknowledge(result);
  }
};

const allRealtimeResources = [
  "party",
  "participants",
  "playlists",
  "tracks",
  "playback",
  "rewards",
] as const satisfies readonly RealtimeResource[];

const emitFullResync = async (
  socket: Parameters<Parameters<RotateSocketServer["on"]>[1]>[0],
  partyId: string,
) => {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { stateVersion: true },
  });
  if (party === null) {
    return;
  }

  socket.emit("state:resync-required", {
    partyId,
    version: party.stateVersion,
    occurredAt: Date.now(),
    data: { resources: allRealtimeResources },
  });
};

export const createSocketServer = (httpServer: HttpServer): RotateSocketServer => {
  const io: RotateSocketServer = new Server(httpServer, {
    cors: {
      origin: env.WEB_ORIGIN,
      credentials: true,
      methods: ["GET", "POST"],
    },
    allowRequest: (request, callback) => {
      const header = (name: string) => {
        const value = request.headers[name];
        return Array.isArray(value) ? value[0] : value;
      };
      const allowed = isTrustedSocketRequestOrigin({
        origin: request.headers.origin,
        host: request.headers.host,
        forwardedHost: header("x-forwarded-host"),
        forwardedProtocol: header("x-forwarded-proto"),
        encrypted: request.socket instanceof TLSSocket && request.socket.encrypted,
      });
      if (!allowed) {
        logger.warn(
          { requestOrigin: request.headers.origin, expectedOrigin: env.WEB_ORIGIN },
          "Socket origin rejected",
        );
      }
      callback(null, allowed);
    },
    maxHttpBufferSize: 10_000,
  });

  io.use(async (socket, next) => {
    try {
      const identity = await loadSocketIdentity(socket.handshake.headers.cookie);
      if (identity === null) {
        next(new Error("AUTHENTICATION_REQUIRED"));
        return;
      }

      socket.data.identity = identity;
      socket.data.actionTimestamps = [];
      next();
    } catch (error) {
      logger.warn({ error }, "Socket authentication failed");
      next(new Error("AUTHENTICATION_REQUIRED"));
    }
  });

  io.on("connection", (socket) => {
    const acceptAction = () => {
      const result = consumeSocketAction(socket.data.actionTimestamps);
      socket.data.actionTimestamps = result.timestamps;
      return result.allowed;
    };

    socket.on("party:subscribe", async (payload, acknowledge) => {
      if (!acceptAction()) {
        reply(acknowledge, rateLimited);
        return;
      }

      const parsed = partySocketPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        reply(acknowledge, invalidPayload);
        return;
      }

      try {
        if (!(await canSubscribeToParty(socket.data.identity, parsed.data.partyId))) {
          reply(acknowledge, forbidden);
          return;
        }

        await socket.join(getPartyRoom(parsed.data.partyId));
        reply(acknowledge, { ok: true });
        await emitFullResync(socket, parsed.data.partyId);
      } catch (error) {
        logger.warn({ error, socketId: socket.id }, "Socket subscription failed");
        reply(acknowledge, forbidden);
      }
    });

    socket.on("party:unsubscribe", async (payload, acknowledge) => {
      if (!acceptAction()) {
        reply(acknowledge, rateLimited);
        return;
      }

      const parsed = partySocketPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        reply(acknowledge, invalidPayload);
        return;
      }
      try {
        if (!(await canSubscribeToParty(socket.data.identity, parsed.data.partyId))) {
          reply(acknowledge, forbidden);
          return;
        }

        await socket.leave(getPartyRoom(parsed.data.partyId));
        reply(acknowledge, { ok: true });
      } catch (error) {
        logger.warn({ error, socketId: socket.id }, "Socket unsubscription failed");
        reply(acknowledge, forbidden);
      }
    });

    socket.on("party:resync-requested", async (payload, acknowledge) => {
      if (!acceptAction()) {
        reply(acknowledge, rateLimited);
        return;
      }

      const parsed = partySocketPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        reply(acknowledge, invalidPayload);
        return;
      }

      try {
        const room = getPartyRoom(parsed.data.partyId);
        if (
          !socket.rooms.has(room) ||
          !(await canSubscribeToParty(socket.data.identity, parsed.data.partyId))
        ) {
          reply(acknowledge, forbidden);
          return;
        }

        reply(acknowledge, { ok: true });
        await emitFullResync(socket, parsed.data.partyId);
      } catch (error) {
        logger.warn({ error, socketId: socket.id }, "Socket resynchronization failed");
        reply(acknowledge, forbidden);
      }
    });
  });

  registerRealtimePublisher(io);
  return io;
};
