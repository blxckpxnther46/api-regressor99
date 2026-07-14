import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app.js";
import * as authService from "./auth.service.js";

describe("auth routes", () => {
  it("sets refresh token cookie without exposing it in register response", async () => {
    vi.spyOn(authService, "register").mockResolvedValueOnce({
      user: { id: "user_1", email: "owner@example.com", name: "Owner" },
      organization: { id: "org_1", name: "Acme", slug: "acme" },
      accessToken: "access-token",
      refreshToken: "refresh-token"
    });

    const response = await request(createApp())
      .post("/api/v1/auth/register")
      .send({
        name: "Owner",
        email: "owner@example.com",
        password: "password123",
        organizationName: "Acme"
      })
      .expect(201);

    expect(response.body.data.refreshToken).toBeUndefined();
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });
});
