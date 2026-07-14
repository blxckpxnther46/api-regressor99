import { describe, expect, it } from "vitest";
import { createDeploymentSchema } from "./deployments.schemas.js";

describe("deployment schemas", () => {
  it("accepts deployment metadata and coerces deployedAt", () => {
    const deployment = createDeploymentSchema.parse({
      environment: "staging",
      commitSha: "abc1234",
      branch: "main",
      version: "1.2.3",
      deployReference: "github-actions-100",
      deployedAt: "2026-07-14T10:00:00.000Z",
      metadata: { region: "ap-south-1" }
    });

    expect(deployment.deployedAt).toBeInstanceOf(Date);
    expect(deployment.metadata).toEqual({ region: "ap-south-1" });
  });

  it("requires an environment", () => {
    expect(() => createDeploymentSchema.parse({ environment: "" })).toThrow();
  });
});

