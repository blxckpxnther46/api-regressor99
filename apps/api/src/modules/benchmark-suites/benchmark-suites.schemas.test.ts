import { HttpMethod } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { createBenchmarkSuiteSchema } from "./benchmark-suites.schemas.js";
import { nextSuiteVersionNumber } from "./benchmark-suites.service.js";

describe("benchmark suite schemas", () => {
  it("accepts a suite with endpoint definitions", () => {
    const suite = createBenchmarkSuiteSchema.parse({
      name: "Checkout API",
      targetBaseUrl: "https://api.example.com",
      loadProfile: { vus: 10, durationSeconds: 60 },
      endpoints: [
        {
          name: "Create order",
          method: HttpMethod.POST,
          path: "/orders",
          expectedStatus: 201,
          timeoutMs: 3000,
          headers: { "content-type": "application/json" },
          body: { sku: "demo" }
        }
      ]
    });

    expect(suite.endpoints[0]!.expectedStatus).toBe(201);
  });

  it("creates the next immutable version number", () => {
    expect(nextSuiteVersionNumber()).toBe(1.1);
    expect(nextSuiteVersionNumber(1.1)).toBe(1.2);
  });
});
