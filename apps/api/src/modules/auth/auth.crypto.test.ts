import { describe, expect, it } from "vitest";
import {
  hashPassword,
  signAccessToken,
  verifyAccessToken,
  verifyPassword
} from "./auth.crypto.js";

describe("auth crypto", () => {
  it("hashes passwords and rejects wrong passwords", async () => {
    const passwordHash = await hashPassword("correct-password");

    expect(await verifyPassword("correct-password", passwordHash)).toBe(true);
    expect(await verifyPassword("wrong-password", passwordHash)).toBe(false);
  });

  it("signs and verifies access tokens", () => {
    const token = signAccessToken({
      userId: "user_123",
      email: "owner@example.com"
    });

    expect(verifyAccessToken(token)).toMatchObject({
      sub: "user_123",
      email: "owner@example.com"
    });
  });
});

