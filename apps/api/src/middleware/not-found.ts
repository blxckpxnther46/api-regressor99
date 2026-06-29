import type { RequestHandler } from "express";
import { fail } from "../shared/http/api-response.js";

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json(
    fail("ROUTE_NOT_FOUND", `Route ${request.method} ${request.path} not found.`, {
      requestId: request.requestId
    })
  );
};
