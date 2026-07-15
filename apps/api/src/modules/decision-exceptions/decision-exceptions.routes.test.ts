import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { signAccessToken } from "../auth/auth.crypto.js";
import * as decisionExceptionsService from "./decision-exceptions.service.js";

vi.mock("./decision-exceptions.service.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./decision-exceptions.service.js")>();
  return {
    ...original,
    approveDecisionException: vi.fn()
  };
});

describe("decision exceptions routes", () => {
  const validToken = signAccessToken({ userId: "user_123", email: "user@example.com" });

  it("returns 401 when authentication is missing", async () => {
    const app = createApp();

    await request(app)
      .post("/api/v1/benchmark-runs/run_123/exceptions")
      .send({
        reason: "Valid override reason",
        expiresAt: new Date(Date.now() + 100000).toISOString()
      })
      .expect(401);
  });

  it("returns 201 when approved successfully by owner/admin", async () => {
    const mockException = {
      id: "exc_123",
      organizationId: "org_123",
      projectId: "proj_123",
      runId: "run_123",
      approvedByUserId: "user_123",
      reason: "Performance regression is expected due to cold start",
      expiresAt: new Date(Date.now() + 100000).toISOString(),
      createdAt: new Date().toISOString()
    };

    vi.mocked(decisionExceptionsService.approveDecisionException).mockResolvedValueOnce({
      ...mockException,
      expiresAt: new Date(mockException.expiresAt),
      createdAt: new Date(mockException.createdAt)
    });

    const app = createApp();

    const response = await request(app)
      .post("/api/v1/benchmark-runs/run_123/exceptions")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        reason: mockException.reason,
        expiresAt: mockException.expiresAt
      })
      .expect(201);

    expect(response.body).toEqual({
      data: mockException,
      meta: {},
      error: null
    });

    expect(decisionExceptionsService.approveDecisionException).toHaveBeenCalledWith(
      "user_123",
      "run_123",
      {
        reason: mockException.reason,
        expiresAt: expect.any(Date)
      }
    );
  });

  it("returns 422 when reason is too short", async () => {
    const app = createApp();

    await request(app)
      .post("/api/v1/benchmark-runs/run_123/exceptions")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        reason: "ab", // Min length is 3
        expiresAt: new Date(Date.now() + 100000).toISOString()
      })
      .expect(422);
  });

  it("returns 422 when expiresAt is in the past", async () => {
    const app = createApp();

    await request(app)
      .post("/api/v1/benchmark-runs/run_123/exceptions")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        reason: "Valid reason",
        expiresAt: new Date(Date.now() - 100000).toISOString() // Past date
      })
      .expect(422);
  });
});
