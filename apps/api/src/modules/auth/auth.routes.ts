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
  logoutSchema,
  refreshSchema,
  registerSchema
} from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateRequest({ body: registerSchema }),
  asyncHandler(async (request, response) => {
    response.status(201).json(ok(await register(request.body)));
  })
);

authRouter.post(
  "/login",
  validateRequest({ body: loginSchema }),
  asyncHandler(async (request, response) => {
    response.json(ok(await login(request.body)));
  })
);

authRouter.post(
  "/refresh",
  validateRequest({ body: refreshSchema }),
  asyncHandler(async (request, response) => {
    response.json(ok(await refresh(request.body.refreshToken)));
  })
);

authRouter.post(
  "/logout",
  validateRequest({ body: logoutSchema }),
  asyncHandler(async (request, response) => {
    response.json(ok(await logout(request.body.refreshToken)));
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (request, response) => {
    response.json(ok(await getMe(request.actor!.userId)));
  })
);
