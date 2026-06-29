import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors/app-error.js";
import { fail } from "../shared/http/api-response.js";
import { logger } from "../shared/logger.js";

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(422).json(
      fail("VALIDATION_ERROR", "Request validation failed.", {
        issues: error.issues,
        requestId: request.requestId
      })
    );
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json(
      fail(error.code, error.message, {
        ...error.details,
        requestId: request.requestId
      })
    );
    return;
  }

  logger.error(
    {
      error,
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl
    },
    "unhandled_request_error"
  );
  response.status(500).json(
    fail("INTERNAL_ERROR", "An unexpected error occurred.", {
      requestId: request.requestId
    })
  );
};
