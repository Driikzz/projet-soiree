import { describe, expect, it } from "vitest";

import { selectFlashParticipant } from "../src/domain/select-flash-participant.js";

const participants = [{ id: "alice" }, { id: "bob" }, { id: "camille" }];

describe("selectFlashParticipant", () => {
  it("returns null when nobody is eligible", () => {
    expect(
      selectFlashParticipant({
        eligibleParticipants: [],
        recentWinnerIds: [],
        randomValue: 0,
      }),
    ).toBeNull();
  });

  it("does not select a recent winner before the eligible pool has rotated", () => {
    const selected = selectFlashParticipant({
      eligibleParticipants: participants,
      recentWinnerIds: ["bob", "alice"],
      randomValue: 0.75,
    });

    expect(selected?.id).toBe("camille");
  });

  it("uses the random value inside the remaining fair pool", () => {
    const selected = selectFlashParticipant({
      eligibleParticipants: participants,
      recentWinnerIds: ["alice"],
      randomValue: 0.9,
    });

    expect(selected?.id).toBe("camille");
  });
});
