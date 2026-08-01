import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;

export const createOpaqueToken = () => randomBytes(TOKEN_BYTES).toString("base64url");

export const hashOpaqueToken = (token: string, secret: string) =>
  createHmac("sha256", secret).update(token).digest("hex");

export const tokenMatchesHash = (token: string, expectedHash: string, secret: string) => {
  const actualHash = hashOpaqueToken(token, secret);
  const actual = Buffer.from(actualHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
