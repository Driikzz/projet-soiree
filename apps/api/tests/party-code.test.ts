import { describe, expect, it } from "vitest";

import { generatePartyCode } from "../src/modules/parties/party-code.js";

describe("party code", () => {
  it("generates readable six-character codes without ambiguous characters", () => {
    const codes = Array.from({ length: 100 }, generatePartyCode);

    expect(codes.every((code) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code))).toBe(true);
    expect(new Set(codes).size).toBeGreaterThan(95);
  });
});
