import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { signAccessToken } from "../auth/auth.crypto.js";
import * as activityLogsService from "./activity-logs.service.js";

vi.mock("./activity-logs.service.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./activity-logs.service.js")>();
  return {
    ...original,
    listActivityLogs: vi.fn(),
    logActivity: vi.fn()
  };
});

describe("activity logs routes", () => {
  const validToken = signAccessToken({ userId: "user_123", email: "user@example.com" });

  it("returns 401 when authentication is missing", async () => {
    const app = createApp();

    await request(app)
      .get("/api/v1/organizations/org_123/activity-logs")
      .expect(401);
  });

  it("returns 200 and activity logs when authenticated", async () => {
    const mockLogsDb = [
      {
        id: "log_1",
        organizationId: "org_123",
        actorUserId: "user_123",
        actorApiKeyId: null,
        action: "project.created" as const,
        entityType: "project",
        entityId: "proj_1",
        metadata: { slug: "my-project" },
        createdAt: new Date()
      }
    ];

    const mockLogsJson = JSON.parse(JSON.stringify(mockLogsDb));

    vi.mocked(activityLogsService.listActivityLogs).mockResolvedValueOnce(mockLogsDb);

    const app = createApp();

    const response = await request(app)
      .get("/api/v1/organizations/org_123/activity-logs")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toEqual({
      data: mockLogsJson,
      meta: {},
      error: null
    });

    expect(activityLogsService.listActivityLogs).toHaveBeenCalledWith(
      "user_123",
      "org_123",
      {}
    );
  });

  it("passes entityType and entityId query filters", async () => {
    vi.mocked(activityLogsService.listActivityLogs).mockResolvedValueOnce([]);

    const app = createApp();

    await request(app)
      .get("/api/v1/organizations/org_123/activity-logs?entityType=project&entityId=proj_1")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);

    expect(activityLogsService.listActivityLogs).toHaveBeenCalledWith(
      "user_123",
      "org_123",
      {
        entityType: "project",
        entityId: "proj_1"
      }
    );
  });

  it("returns 422 when query parameters are invalid or empty", async () => {
    const app = createApp();

    // Query parameters cannot be empty strings according to schema .min(1)
    await request(app)
      .get("/api/v1/organizations/org_123/activity-logs?entityType=")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(422);
  });
});
