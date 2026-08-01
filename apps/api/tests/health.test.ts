import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("health routes", () => {
  const app = createApp({
    readinessCheck: async () => true,
  });

  it.each(["/api/health", "/api/health/live", "/api/health/ready"])(
    "returns an operational response from %s",
    async (path) => {
      const response = await request(app).get(path).expect(200);

      expect(response.body).toMatchObject({
        status: "ok",
        service: "songfest-api",
      });
      expect(response.headers).toHaveProperty("x-request-id");
      expect(new Date(response.body.timestamp as string).toString()).not.toBe("Invalid Date");
    },
  );

  it("does not expose Express implementation details", async () => {
    const response = await request(app).get("/api/health").expect(200);

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("returns the public error contract for an unknown route", async () => {
    const response = await request(app).get("/api/unknown").expect(404);

    expect(response.body).toMatchObject({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "Cette route n’existe pas.",
      },
    });
  });

  it("returns 503 when PostgreSQL is unavailable", async () => {
    const unavailableApp = createApp({
      readinessCheck: async () => false,
    });

    const response = await request(unavailableApp).get("/api/health/ready").expect(503);

    expect(response.body).toMatchObject({
      status: "unavailable",
      service: "songfest-api",
    });
  });
});
