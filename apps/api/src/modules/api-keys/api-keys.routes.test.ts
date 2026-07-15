import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import { signAccessToken } from "../auth/auth.crypto.js";
import * as apiKeysService from "./api-keys.service.js";

vi.mock("./api-keys.service.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./api-keys.service.js")>();
  return {
    ...original,
    createApiKey: vi.fn(),
    listApiKeys: vi.fn(),
    revokeApiKey: vi.fn()
  };
});

describe("api keys routes", () => {
  const validToken = signAccessToken({ userId: "user_123", email: "user@example.com" });

  it("returns 401 when authentication is missing on GET", async () => {
    const app = createApp();

    await request(app)
      .get("/api/v1/organizations/org_123/api-keys")
      .expect(401);
  });

  it("returns 200 and list of API keys on GET when authenticated", async () => {
    const mockKeys = [
      {
        id: "key_1",
        organizationId: "org_123",
        projectId: null,
        name: "CI Key",
        keyPrefix: "r99_123456",
        scopes: ["benchmark_runs:create"],
        lastUsedAt: null,
        revokedAt: null,
        createdByUserId: "user_123",
        createdAt: new Date().toISOString()
      }
    ];

    vi.mocked(apiKeysService.listApiKeys).mockResolvedValueOnce(mockKeys as any);

    const app = createApp();

    const response = await request(app)
      .get("/api/v1/organizations/org_123/api-keys")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toEqual({
      data: mockKeys,
      meta: {},
      error: null
    });

    expect(apiKeysService.listApiKeys).toHaveBeenCalledWith("user_123", "org_123");
  });

  it("returns 201 and creates API key on POST", async () => {
    const mockKeyResponse = {
      id: "key_1",
      organizationId: "org_123",
      projectId: "proj_123",
      name: "Prod Deployment Key",
      keyPrefix: "r99_123456",
      scopes: ["deployments:create"],
      lastUsedAt: null,
      revokedAt: null,
      createdByUserId: "user_123",
      createdAt: new Date().toISOString(),
      key: "r99_secretkey123"
    };

    vi.mocked(apiKeysService.createApiKey).mockResolvedValueOnce(mockKeyResponse as any);

    const app = createApp();

    const response = await request(app)
      .post("/api/v1/organizations/org_123/api-keys")
      .set("Authorization", `Bearer ${validToken}`)
      .send({
        name: "Prod Deployment Key",
        projectId: "proj_123",
        scopes: ["deployments:create"]
      })
      .expect(201);

    expect(response.body).toEqual({
      data: mockKeyResponse,
      meta: {},
      error: null
    });

    expect(apiKeysService.createApiKey).toHaveBeenCalledWith(
      "user_123",
      "org_123",
      {
        name: "Prod Deployment Key",
        projectId: "proj_123",
        scopes: ["deployments:create"]
      }
    );
  });

  it("returns 200 and revokes API key on DELETE", async () => {
    const mockRevoked = {
      id: "key_123",
      organizationId: "org_123",
      projectId: null,
      name: "Revoked Key",
      keyPrefix: "r99_123",
      scopes: ["projects:read"],
      lastUsedAt: null,
      revokedAt: new Date().toISOString(),
      createdByUserId: "user_123",
      createdAt: new Date().toISOString()
    };

    vi.mocked(apiKeysService.revokeApiKey).mockResolvedValueOnce(mockRevoked as any);

    const app = createApp();

    const response = await request(app)
      .delete("/api/v1/api-keys/key_123")
      .set("Authorization", `Bearer ${validToken}`)
      .expect(200);

    expect(response.body).toEqual({
      data: mockRevoked,
      meta: {},
      error: null
    });

    expect(apiKeysService.revokeApiKey).toHaveBeenCalledWith("user_123", "key_123");
  });
});
