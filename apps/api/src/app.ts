import { randomUUID } from "node:crypto";

import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createHealthRouter, type ReadinessCheck } from "./modules/health/health.routes.js";
import { checkDatabaseReadiness } from "./modules/health/readiness.js";
import {
  createAdminPlaylistRouter,
  createParticipantPlaylistRouter,
} from "./modules/playlists/playlist.routes.js";
import { createSpotifyRouter } from "./modules/spotify/spotify.routes.js";
import { createTrackRouter } from "./modules/tracks/track.routes.js";
import { createVoteRouter } from "./modules/votes/vote.routes.js";
import {
  createAdminPartyRouter,
  createParticipantRouter,
  createPublicPartyRouter,
} from "./modules/parties/party.routes.js";
import { createPlaybackRouter } from "./modules/playback/playback.routes.js";
import { createAdminDashboardRouter } from "./modules/admin/admin.routes.js";
import { createFlashRouter } from "./modules/flash/flash.routes.js";

export interface AppDependencies {
  readinessCheck?: ReadinessCheck;
}

export const createApp = ({ readinessCheck = checkDatabaseReadiness }: AppDependencies = {}) => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: (request, response) => {
        const requestId = request.headers["x-request-id"] ?? randomUUID();
        response.setHeader("X-Request-Id", requestId);
        return requestId;
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-Request-Id"],
      exposedHeaders: ["X-Request-Id"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "20kb" }));
  app.use(cookieParser());

  app.use("/api/health", createHealthRouter(readinessCheck));
  app.use("/api/admin/auth", createAuthRouter());
  app.use("/api/admin", createAdminPlaylistRouter());
  app.use("/api/admin/parties", createAdminPartyRouter());
  app.use("/api", createParticipantPlaylistRouter());
  app.use("/api", createSpotifyRouter());
  app.use("/api", createTrackRouter());
  app.use("/api", createVoteRouter());
  app.use("/api", createPlaybackRouter());
  app.use("/api", createAdminDashboardRouter());
  app.use("/api", createFlashRouter());
  app.use("/api/parties", createPublicPartyRouter());
  app.use("/api/participant", createParticipantRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
