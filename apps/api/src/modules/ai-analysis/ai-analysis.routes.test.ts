import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { signAccessToken } from "../auth/auth.crypto.js";
import * as aiAnalysisService from "./ai-analysis.service.js";

vi.mock("./ai-analysis.service.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./ai-analysis.service.js")>();
  return {
    ...original,
    generateRunAiAnalysis: vi.fn(),
    listRunAiAnalyses: vi.fn()
  };
});

describe("ai-analysis routes", () => {
  const validToken = signAccessToken({ userId: "user_123", email: "user@example.com" });

  it("returns 401 when authentication is missing on GET", async () => {
    const app = createApp();

    await request(app)
      .get("/api/v1/benchmark-runs/run_123/ai-analysis")
      .expect(401);
  });

  it("returns 200 and lists AI insights on GET", async () => {
    const mockInsights = [
      {
        id: "insight_123",
        organizationId: "org_123",
        projectId: "proj_123",
        runId: "run_123",
        promptVersion: "v1",
        provider: "nvidia",
        model: "nvidia/nemotron-3-super-120b-a12b",
        inputFacts: {},
        output: { summary: "Latency regression detected." },
        rawText: "raw",
        failureCount: 0,
        createdAt: new Date().toISOString()
      }
    ];

    vi.mocked(aiAnalysisService.listRunAiAnalyses).mockResolvedValueOnce(mockInsights as any);

    const app = createApp();

    const response = await request(app)
      .get("/api/v1/benchmark-runs/run_123/ai-analysis")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toEqual({
      data: mockInsights,
      meta: {},
      error: null
    });

    expect(aiAnalysisService.listRunAiAnalyses).toHaveBeenCalledWith("user_123", "run_123");
  });

  it("returns 21 test status (201) and generates AI insight on POST", async () => {
    const mockInsight = {
      id: "insight_123",
      organizationId: "org_123",
      projectId: "proj_123",
      runId: "run_123",
      promptVersion: "v1",
      provider: "nvidia",
      model: "nvidia/nemotron-3-super-120b-a12b",
      inputFacts: {},
      output: { summary: "Latency regression detected." },
      rawText: "raw",
      failureCount: 0,
      createdAt: new Date().toISOString()
    };

    vi.mocked(aiAnalysisService.generateRunAiAnalysis).mockResolvedValueOnce(mockInsight as any);

    const app = createApp();

    const response = await request(app)
      .post("/api/v1/benchmark-runs/run_123/ai-analysis")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(201);

    expect(response.body).toEqual({
      data: mockInsight,
      meta: {},
      error: null
    });

    expect(aiAnalysisService.generateRunAiAnalysis).toHaveBeenCalledWith("user_123", "run_123");
  });
});
