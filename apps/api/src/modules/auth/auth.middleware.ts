import type { RequestHandler } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import { verifyAccessToken } from "./auth.crypto.js";

export const requireAuth: RequestHandler = (request, _response, next) => {
  const authorization = request.header("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    next(new AppError(401, "AUTH_REQUIRED", "Authentication required."));
    return;
  }

  const payload = verifyAccessToken(token);
  request.actor = {
    userId: payload.sub,
    email: payload.email
  };

  next();
};

