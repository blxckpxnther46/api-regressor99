import { ExecutionStatus, TriggerSource } from "@prisma/client";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import * as ciCdService from "./ci-cd.service.js";
import { signAccessToken } from "../auth/auth.crypto.js";

vi.mock("./ci-cd.service.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./ci-cd.service.js")>();
  return {
    ...original,
    createCiCdBenchmarkRun: vi.fn()
  };
});

describe("ci-cd routes", () => {
  it("returns 401 when Authorization header is missing or malformed", async () => {
    const app = createApp();

    await request(app)
      .post("/api/v1/ci/benchmark-runs")
      .send({
        projectId: "proj_123",
        suiteId: "suite_123",
        environment: "production"
      })
      .expect(401);
  });

  it("triggers benchmark run when valid API key and payload are sent", async () => {
    const mockRun = {
      id: "run_123",
      organizationId: "org_123",
      projectId: "proj_123",
      suiteId: "suite_123",
      suiteVersionId: "ver_123",
      deploymentId: "dep_123",
      triggeredByApiKeyId: "key_123",
      triggerSource: TriggerSource.CI_CD,
      environment: "production",
      targetBaseUrl: "https://api.test",
      executionStatus: ExecutionStatus.QUEUED,
      createdAt: new Date().toISOString()
    };

    vi.mocked(ciCdService.createCiCdBenchmarkRun).mockResolvedValueOnce({
      ...mockRun,
      createdAt: new Date(mockRun.createdAt)
    });

    const app = createApp();

    const response = await request(app)
      .post("/api/v1/ci/benchmark-runs")
      .set("Authorization", "Bearer r99_testkey")
      .send({
        projectId: "proj_123",
        suiteId: "suite_123",
        environment: "production",
        deployment: {
          commitSha: "sha123",
          branch: "main"
        }
      })
      .expect(201);

    expect(response.body).toEqual({
      data: mockRun,
      meta: {},
      error: null
    });

    expect(ciCdService.createCiCdBenchmarkRun).toHaveBeenCalledWith(
      "r99_testkey",
      {
        projectId: "proj_123",
        suiteId: "suite_123",
        environment: "production",
        deployment: {
          commitSha: "sha123",
          branch: "main"
        }
      }
    );
  });

  it("returns 422 when required schema fields are missing", async () => {
    const app = createApp();

    await request(app)
      .post("/api/v1/ci/benchmark-runs")
      .set("Authorization", "Bearer r99_testkey")
      .send({
        projectId: "", // Invalid: min 1 char
        environment: "production"
      })
      .expect(422);
  });
});
