import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { decryptToken, encryptToken } from "../src/modules/spotify/token-encryption.js";

describe("Spotify token encryption", () => {
  const encryptionKey = randomBytes(32);

  it("round-trips a token without exposing its plaintext", () => {
    const token = "spotify-access-token-for-tests";
    const encrypted = encryptToken(token, encryptionKey);

    expect(encrypted).not.toContain(token);
    expect(decryptToken(encrypted, encryptionKey)).toBe(token);
  });

  it("uses a new initialization vector for every encryption", () => {
    const first = encryptToken("same-token", encryptionKey);
    const second = encryptToken("same-token", encryptionKey);

    expect(first).not.toBe(second);
  });

  it("rejects tampered ciphertext and the wrong encryption key", () => {
    const encrypted = encryptToken("protected-token", encryptionKey);
    const parts = encrypted.split(".");
    const ciphertext = parts.at(-1);
    if (ciphertext === undefined) {
      throw new Error("Expected encrypted ciphertext");
    }

    parts[parts.length - 1] = `${ciphertext.slice(0, -1)}A`;

    expect(() => decryptToken(parts.join("."), encryptionKey)).toThrow();
    expect(() => decryptToken(encrypted, randomBytes(32))).toThrow();
  });
});
