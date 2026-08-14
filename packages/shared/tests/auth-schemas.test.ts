import { describe, expect, it } from "vitest";

import { userLoginRequestSchema, userRegistrationRequestSchema } from "../src/index.js";

describe("user account schemas", () => {
  it("accepts a standard account registration", () => {
    expect(
      userRegistrationRequestSchema.safeParse({
        displayName: "Léa",
        email: "lea@example.com",
        password: "une-phrase-secrete-solide",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid emails and short passwords", () => {
    const result = userRegistrationRequestSchema.safeParse({
      displayName: "Léa",
      email: "pas-un-email",
      password: "court",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        "Le mot de passe doit contenir au moins 12 caractères.",
      );
    }
  });

  it("keeps legacy usernames valid as login identifiers", () => {
    expect(
      userLoginRequestSchema.safeParse({
        identifier: "organizer",
        password: "integration-password-2026",
      }).success,
    ).toBe(true);
  });
});
