import { describe, expect, it } from "vitest";

import { getPartyRoom } from "../src/socket/party-room.js";
import { parseCookieHeader } from "../src/socket/socket-auth.js";
import { consumeSocketAction } from "../src/socket/socket-rate-limit.js";

describe("socket security helpers", () => {
  it("parses cookies without interpreting room data", () => {
    const cookies = parseCookieHeader(
      "songfest_admin_session=opaque%20token; theme=night; malformed",
    );

    expect(cookies.get("songfest_admin_session")).toBe("opaque token");
    expect(cookies.get("theme")).toBe("night");
    expect(cookies.has("malformed")).toBe(false);
  });

  it("derives a namespaced room from a validated party identifier", () => {
    expect(getPartyRoom("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "party:550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("limits repeated socket actions inside the rolling window", () => {
    let timestamps: number[] = [];

    for (let index = 0; index < 30; index += 1) {
      const result = consumeSocketAction(timestamps, 100_000 + index);
      expect(result.allowed).toBe(true);
      timestamps = result.timestamps;
    }

    expect(consumeSocketAction(timestamps, 100_100).allowed).toBe(false);
    expect(consumeSocketAction(timestamps, 161_000).allowed).toBe(true);
  });
});
