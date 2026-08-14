import { describe, expect, it } from "vitest";

import {
  isPartyInactive,
  PARTY_INACTIVITY_TIMEOUT_MS,
} from "../src/modules/parties/party-lifecycle.service.js";

describe("party lifecycle", () => {
  const now = new Date("2026-08-14T20:00:00.000Z");

  it("closes a party after two hours without playback activity", () => {
    const lastActivity = new Date(now.getTime() - PARTY_INACTIVITY_TIMEOUT_MS);

    expect(isPartyInactive(new Date(), lastActivity, now)).toBe(true);
  });

  it("keeps a recently active party open", () => {
    const lastActivity = new Date(now.getTime() - PARTY_INACTIVITY_TIMEOUT_MS + 1);

    expect(isPartyInactive(new Date(0), lastActivity, now)).toBe(false);
  });

  it("uses the start time until the first song is observed", () => {
    const startedAt = new Date(now.getTime() - PARTY_INACTIVITY_TIMEOUT_MS);

    expect(isPartyInactive(startedAt, null, now)).toBe(true);
    expect(isPartyInactive(null, null, now)).toBe(false);
  });
});
