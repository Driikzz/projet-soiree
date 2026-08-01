import { describe, expect, it } from "vitest";

import {
  createOpaqueToken,
  hashOpaqueToken,
  tokenMatchesHash,
} from "../src/modules/auth/session-crypto.js";

describe("session token security", () => {
  const secret = "a-test-secret-that-is-longer-than-thirty-two-characters";

  it("creates non-repeating opaque tokens", () => {
    const tokens = new Set(Array.from({ length: 50 }, createOpaqueToken));

    expect(tokens.size).toBe(50);
    expect([...tokens].every((token) => token.length >= 40)).toBe(true);
  });

  it("stores only a keyed hash and validates it in constant time", () => {
    const token = createOpaqueToken();
    const hash = hashOpaqueToken(token, secret);

    expect(hash).not.toContain(token);
    expect(tokenMatchesHash(token, hash, secret)).toBe(true);
    expect(tokenMatchesHash(`${token}x`, hash, secret)).toBe(false);
  });
});
