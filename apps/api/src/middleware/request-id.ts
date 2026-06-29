import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestIdMiddleware: RequestHandler = (request, response, next) => {
  const incomingRequestId = request.header("x-request-id");
  const requestId = incomingRequestId?.trim() || randomUUID();

  request.requestId = requestId;
  response.setHeader("x-request-id", requestId);

  next();
};

