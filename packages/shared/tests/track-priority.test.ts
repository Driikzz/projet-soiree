import { describe, expect, it } from "vitest";

import {
  calculateTrackPriorityPoints,
  calculateTrackPriorityScore,
} from "../src/domain/track-priority.js";

describe("track flame priority", () => {
  it("weights consensus more strongly than flame intensity", () => {
    expect(calculateTrackPriorityPoints(3, 3)).toBeGreaterThan(calculateTrackPriorityPoints(1, 3));
  });

  it("converts full support and intensity to 100", () => {
    expect(calculateTrackPriorityScore(4, 12, 4)).toBe(100);
  });

  it("returns zero without active participants", () => {
    expect(calculateTrackPriorityScore(2, 4, 0)).toBe(0);
  });
});
