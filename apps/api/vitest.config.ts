import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/integration/**"],
    env: {
      LOG_LEVEL: "silent",
      SPOTIFY_CLIENT_ID: "",
      SPOTIFY_CLIENT_SECRET: "",
      SPOTIFY_REDIRECT_URI: "",
      SPOTIFY_TOKEN_ENCRYPTION_KEY: "",
    },
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
