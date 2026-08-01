import { describe, expect, it } from "vitest";

import { partySocketPayloadSchema, realtimeResourceSchema } from "../src/socket/events.js";

describe("socket event schemas", () => {
  it("accepts a strict party subscription payload", () => {
    expect(
      partySocketPayloadSchema.parse({
        partyId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toEqual({
      partyId: "550e8400-e29b-41d4-a716-446655440000",
    });
  });

  it("rejects invalid identifiers and unexpected fields", () => {
    expect(
      partySocketPayloadSchema.safeParse({
        partyId: "not-a-uuid",
        room: "admin",
      }).success,
    ).toBe(false);
  });

  it("only accepts known resynchronization resources", () => {
    expect(realtimeResourceSchema.safeParse("playlists").success).toBe(true);
    expect(realtimeResourceSchema.safeParse("spotify-token").success).toBe(false);
  });
});
