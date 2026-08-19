import { Router } from "express";

import type { HealthResponse } from "@songfest/shared";

export type ReadinessCheck = () => Promise<boolean>;

const createHealthResponse = (): HealthResponse => ({
  status: "ok",
  service: "rotate-api",
  timestamp: new Date().toISOString(),
});

export const createHealthRouter = (readinessCheck: ReadinessCheck) => {
  const router = Router();

  router.get("/", (_request, response) => {
    response.json(createHealthResponse());
  });

  router.get("/live", (_request, response) => {
    response.json(createHealthResponse());
  });

  router.get("/ready", async (_request, response) => {
    const ready = await readinessCheck();

    if (!ready) {
      response.status(503).json({
        status: "unavailable",
        service: "rotate-api",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    response.json(createHealthResponse());
  });

  return router;
};
