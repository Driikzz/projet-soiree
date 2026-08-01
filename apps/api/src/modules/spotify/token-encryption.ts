import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const VERSION = "v1";
const ADDITIONAL_DATA = Buffer.from("songfest:spotify-token:v1", "utf8");

export const encryptToken = (plaintext: string, key: Buffer) => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(ADDITIONAL_DATA);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authenticationTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
};

export const decryptToken = (encrypted: string, key: Buffer) => {
  const [version, encodedIv, encodedTag, encodedCiphertext] = encrypted.split(".");
  if (
    version !== VERSION ||
    encodedIv === undefined ||
    encodedTag === undefined ||
    encodedCiphertext === undefined
  ) {
    throw new Error("Unsupported encrypted token format");
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(encodedIv, "base64url"));
  decipher.setAAD(ADDITIONAL_DATA);
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};
