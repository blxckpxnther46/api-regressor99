import { describe, expect, it } from "vitest";
import {
  hashVerificationToken,
  isUnsafeTargetHost
} from "./target-verification.service.js";

describe("target verification service", () => {
  it("detects unsafe local/private targets", () => {
    expect(isUnsafeTargetHost("localhost")).toBe(true);
    expect(isUnsafeTargetHost("127.0.0.1")).toBe(true);
    expect(isUnsafeTargetHost("10.0.0.5")).toBe(true);
    expect(isUnsafeTargetHost("192.168.1.10")).toBe(true);
    expect(isUnsafeTargetHost("169.254.169.254")).toBe(true);
    expect(isUnsafeTargetHost("api.example.com")).toBe(false);
  });

  it("hashes verification tokens deterministically", () => {
    expect(hashVerificationToken("token")).toBe(hashVerificationToken("token"));
    expect(hashVerificationToken("token")).not.toBe(hashVerificationToken("other"));
  });
});

