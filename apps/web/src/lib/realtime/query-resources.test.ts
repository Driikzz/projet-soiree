import { describe, expect, it } from "vitest";

import { getQueryKeysForResources } from "./query-resources";

describe("realtime query resources", () => {
  it("invalidates only the query families affected by a track event", () => {
    expect(getQueryKeysForResources("party-id", ["tracks"])).toEqual([
      ["admin-dashboard", "party-id"],
      ["playlist-tracks"],
    ]);
  });

  it("maps a full resynchronization to party-scoped caches", () => {
    const keys = getQueryKeysForResources("party-id", [
      "party",
      "participants",
      "playlists",
      "tracks",
      "playback",
      "rewards",
      "flash",
    ]);

    expect(keys).toContainEqual(["admin-party", "party-id"]);
    expect(keys).toContainEqual(["participant-playlists", "party-id"]);
    expect(keys).toContainEqual(["spotify-playback", "party-id"]);
    expect(keys).toContainEqual(["admin-rewards", "party-id"]);
    expect(keys).toContainEqual(["party-flash", "party-id"]);
  });
});
