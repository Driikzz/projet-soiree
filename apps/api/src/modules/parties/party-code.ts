import { randomInt } from "node:crypto";

const PARTY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PARTY_CODE_LENGTH = 6;

export const generatePartyCode = () =>
  Array.from(
    { length: PARTY_CODE_LENGTH },
    () => PARTY_CODE_ALPHABET[randomInt(PARTY_CODE_ALPHABET.length)],
  ).join("");
