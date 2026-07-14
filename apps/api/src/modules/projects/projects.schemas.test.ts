import { describe, expect, it } from "vitest";
import { createProjectSchema } from "./projects.schemas.js";

describe("project schemas", () => {
  it("accepts lowercase dashed slugs", () => {
    expect(
      createProjectSchema.parse({
        organizationId: "org_1",
        name: "Payment API",
        slug: "payment-api",
        defaultBaseUrl: "https://api.example.com"
      }).slug
    ).toBe("payment-api");
  });

  it("rejects unsafe slugs", () => {
    expect(() =>
      createProjectSchema.parse({
        organizationId: "org_1",
        name: "Payment API",
        slug: "../payment"
      })
    ).toThrow();
  });
});

