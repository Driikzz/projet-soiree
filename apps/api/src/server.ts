import { createServer } from "node:http";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import {
  startPlaybackOrchestrator,
  stopPlaybackOrchestrator,
} from "./modules/playback/playback.orchestrator.js";
import { createSocketServer } from "./socket/socket-server.js";

const app = createApp();
const httpServer = createServer(app);
const io = createSocketServer(httpServer);
startPlaybackOrchestrator(env.PLAYBACK_SYNC_INTERVAL_MS);

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Stopping server");
  stopPlaybackOrchestrator();

  io.close(() => {
    httpServer.close((error) => {
      if (error) {
        logger.error({ error }, "Server shutdown failed");
        process.exitCode = 1;
      }
    });
  });
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

httpServer.listen(env.PORT, env.HOST, () => {
  logger.info(
    {
      host: env.HOST,
      port: env.PORT,
    },
    "SongFest API is ready",
  );
});
