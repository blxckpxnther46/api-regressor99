import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { createCiCdBenchmarkRun, readBearerToken } from "./ci-cd.service.js";
import { createCiCdBenchmarkRunSchema } from "./ci-cd.schemas.js";

export const ciCdRouter = Router();

ciCdRouter.post(
  "/benchmark-runs",
  validateRequest({ body: createCiCdBenchmarkRunSchema }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(
        await createCiCdBenchmarkRun(
          readBearerToken(request.header("authorization")),
          request.body
        )
      )
    );
  })
);

