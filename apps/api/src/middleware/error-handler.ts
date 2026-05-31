import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors/app-error.js";
import { fail } from "../shared/http/api-response.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(422).json(
      fail("VALIDATION_ERROR", "Request validation failed.", {
        issues: error.issues
      })
    );
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json(
      fail(error.code, error.message, error.details)
    );
    return;
  }

  console.error(error);
  response.status(500).json(
    fail("INTERNAL_ERROR", "An unexpected error occurred.")
  );
};

