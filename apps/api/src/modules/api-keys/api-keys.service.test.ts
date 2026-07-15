import { describe, expect, it } from "vitest";
import {
  assertApiKeyProjectAccess,
  assertApiKeyScope,
  generateApiKey,
  hashApiKey,
  hasApiKeyScope
} from "./api-keys.service.js";

describe("api key helpers", () => {
  it("generates and hashes API keys", () => {
    const key = generateApiKey();

    expect(key.startsWith("r99_")).toBe(true);
    expect(hashApiKey(key)).toBe(hashApiKey(key));
    expect(hashApiKey(key)).not.toBe(key);
  });

  it("checks scopes", () => {
    expect(hasApiKeyScope(["benchmark_runs:create"], "benchmark_runs:create")).toBe(true);
    expect(() => assertApiKeyScope([], "benchmark_runs:create")).toThrow();
  });

  it("checks project scope", () => {
    expect(() => assertApiKeyProjectAccess({ projectId: null }, "project_1")).not.toThrow();
    expect(() => assertApiKeyProjectAccess({ projectId: "project_1" }, "project_1")).not.toThrow();
    expect(() => assertApiKeyProjectAccess({ projectId: "project_2" }, "project_1")).toThrow();
  });
});

