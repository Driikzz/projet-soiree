import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
      WEB_ORIGIN: "http://127.0.0.1:5173",
      SESSION_SECRET: "songfest-integration-session-secret",
      SPOTIFY_CLIENT_ID: "",
      SPOTIFY_CLIENT_SECRET: "",
      SPOTIFY_REDIRECT_URI: "",
      SPOTIFY_TOKEN_ENCRYPTION_KEY: "",
    },
  },
});
