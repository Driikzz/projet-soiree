import { describe, expect, it } from "vitest";

import { calculateRemainingQuota } from "../src/domain/quota.js";

describe("calculateRemainingQuota", () => {
  it("calculates the quota independently for a playlist", () => {
    expect(
      calculateRemainingQuota({
        baseQuota: 5,
        extraTrackUses: 0,
        activeContributionCount: 3,
      }),
    ).toBe(2);
  });

  it("applies EXTRA_TRACK uses", () => {
    expect(
      calculateRemainingQuota({
        baseQuota: 5,
        extraTrackUses: 2,
        activeContributionCount: 6,
      }),
    ).toBe(1);
  });

  it("never returns a negative value", () => {
    expect(
      calculateRemainingQuota({
        baseQuota: 5,
        extraTrackUses: 0,
        activeContributionCount: 12,
      }),
    ).toBe(0);
  });
});
