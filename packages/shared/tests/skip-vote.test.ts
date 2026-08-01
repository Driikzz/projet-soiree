import { describe, expect, it } from "vitest";

import { calculateRequiredSkipVotes } from "../src/domain/skip-vote.js";

describe("calculateRequiredSkipVotes", () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 3],
    [10, 6],
  ])("requires a strict majority for %i active participants", (participants, expected) => {
    expect(calculateRequiredSkipVotes(participants)).toBe(expected);
  });
});
