import { describe, expect, it } from "vitest";

import { partyPeopleSchema } from "../src/index.js";

describe("party people schema", () => {
  it("exposes only the minimal social context required by PEOPLE", () => {
    const people = partyPeopleSchema.parse({
      host: { displayName: "Jules" },
      participants: [
        {
          id: "8d88efb7-02f1-46f8-bc50-3e39573dad84",
          nickname: "Rémi",
          avatarSeed: "rotate-mark-1",
          contributionCount: 2,
          isCurrent: true,
        },
      ],
    });

    expect(people.host.displayName).toBe("Jules");
    expect(people.participants[0]).toMatchObject({ nickname: "Rémi", isCurrent: true });
  });
});
