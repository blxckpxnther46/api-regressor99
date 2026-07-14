import type { Response } from "express";
import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "./auth.middleware.js";
import {
  login,
  logout,
  getMe,
  refresh,
  register
} from "./auth.service.js";
import {
  loginSchema,
  registerSchema
} from "./auth.schemas.js";

export const authRouter = Router();
const refreshCookieName = "refreshToken";

function setRefreshCookie(response: Response, refreshToken: string) {
  response.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function clearRefreshCookie(response: Response) {
  response.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth"
  });
}

function readRefreshCookie(cookieHeader: string | undefined) {
  return cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim().split("="))
    .find(([name]) => name === refreshCookieName)?.[1];
}

function publicAuthPayload<T extends { refreshToken: string }>(
  response: Response,
  payload: T
) {
  const { refreshToken, ...publicPayload } = payload;
  setRefreshCookie(response, refreshToken);
  return publicPayload;
}

authRouter.post(
  "/register",
  validateRequest({ body: registerSchema }),
  asyncHandler(async (request, response) => {
    response
      .status(201)
      .json(ok(publicAuthPayload(response, await register(request.body))));
  })
);

authRouter.post(
  "/login",
  validateRequest({ body: loginSchema }),
  asyncHandler(async (request, response) => {
    response.json(ok(publicAuthPayload(response, await login(request.body))));
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (request, response) => {
    const refreshToken = readRefreshCookie(request.header("cookie"));

    response.json(ok(publicAuthPayload(response, await refresh(refreshToken ?? ""))));
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (request, response) => {
    const refreshToken = readRefreshCookie(request.header("cookie"));

    if (refreshToken) {
      await logout(refreshToken);
    }

    clearRefreshCookie(response);
    response.json(ok({ success: true }));
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (request, response) => {
    response.json(ok(await getMe(request.actor!.userId)));
  })
);
