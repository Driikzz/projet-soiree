import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("request security", () => {
  const app = createApp({ readinessCheck: async () => true });

  it("rejects an unsafe request from an unexpected origin", async () => {
    const response = await request(app)
      .post("/api/admin/auth/login")
      .set("Origin", "https://example.invalid")
      .send({ username: "admin", password: "a-valid-looking-password" })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("validates request bodies before authentication logic", async () => {
    const response = await request(app)
      .post("/api/admin/auth/login")
      .set("Origin", "http://127.0.0.1:5173")
      .send({ username: "a", password: "short" })
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Certaines informations sont invalides.",
    });
    expect(response.body.error.details.fields).toHaveLength(2);
  });

  it("validates route parameters without querying the database", async () => {
    const response = await request(app).get("/api/parties/not-a-code").expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("protects the administration dashboard without querying another party", async () => {
    const response = await request(app)
      .get("/api/admin/parties/550e8400-e29b-41d4-a716-446655440000/dashboard")
      .expect(401);

    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("rejects reward grants from an untrusted origin before using the session", async () => {
    const response = await request(app)
      .post("/api/admin/rewards")
      .set("Origin", "https://example.invalid")
      .send({
        partyId: "550e8400-e29b-41d4-a716-446655440000",
        participantId: "39c52350-459d-4c6a-a662-4efc62734c1b",
        type: "DOUBLE_TRACK",
        uses: 1,
      })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("protects Flash submissions like every other participant mutation", async () => {
    const response = await request(app)
      .post("/api/parties/550e8400-e29b-41d4-a716-446655440000/flash/submit")
      .set("Origin", "https://example.invalid")
      .send({ spotifyTrackId: "spotify-track-id" })
      .expect(403);

    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("does not expose a Flash turn without a participant session", async () => {
    const response = await request(app)
      .get("/api/parties/550e8400-e29b-41d4-a716-446655440000/flash")
      .expect(401);

    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
