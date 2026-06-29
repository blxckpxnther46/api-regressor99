import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../app.js";

describe("health routes", () => {
  it("returns API health status with the standard response shape", async () => {
    const app = createApp();

    const response = await request(app)
      .get("/api/v1/health")
      .set("x-request-id", "test-request-id")
      .expect(200);

    expect(response.headers["x-request-id"]).toBe("test-request-id");
    expect(response.body).toEqual({
      data: {
        status: "ok",
        timestamp: expect.any(String)
      },
      meta: {},
      error: null
    });
  });

  it("returns a stable not-found error for unknown routes", async () => {
    const app = createApp();

    const response = await request(app).get("/api/v1/unknown").expect(404);

    expect(response.body.error).toMatchObject({
      code: "ROUTE_NOT_FOUND"
    });
    expect(response.body.error.details.requestId).toEqual(expect.any(String));
  });
});

