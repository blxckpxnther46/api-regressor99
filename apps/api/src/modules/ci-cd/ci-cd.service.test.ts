import { describe, expect, it } from "vitest";
import { readBearerToken } from "./ci-cd.service.js";

describe("ci/cd auth helpers", () => {
  it("reads bearer token", () => {
    expect(readBearerToken("Bearer r99_test")).toBe("r99_test");
  });

  it("rejects missing bearer token", () => {
    expect(() => readBearerToken(undefined)).toThrow();
    expect(() => readBearerToken("Basic x")).toThrow();
  });
});

