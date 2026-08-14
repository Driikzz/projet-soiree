import { describe, expect, it } from "vitest";

import { SPOTIFY_SCOPES } from "../src/modules/spotify/spotify.constants.js";

describe("Spotify OAuth scopes", () => {
  it("requests the private profile required by GET /me", () => {
    expect(SPOTIFY_SCOPES).toContain("user-read-private");
  });
});
