import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  createBenchmarkRun,
  executeBenchmarkRun,
  getBenchmarkRun,
  getBenchmarkRunMetrics
} from "./benchmark-runs.service.js";
import {
  benchmarkRunIdParamsSchema,
  createBenchmarkRunSchema,
  suiteBenchmarkRunsParamsSchema
} from "./benchmark-runs.schemas.js";

export const suiteBenchmarkRunsRouter = Router({ mergeParams: true });
export const benchmarkRunsRouter = Router();

suiteBenchmarkRunsRouter.use(requireAuth);
benchmarkRunsRouter.use(requireAuth);

suiteBenchmarkRunsRouter.post(
  "/:suiteId/runs",
  validateRequest({
    params: suiteBenchmarkRunsParamsSchema,
    body: createBenchmarkRunSchema
  }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(
        await createBenchmarkRun(
          request.actor!.userId,
          request.params.suiteId!,
          request.body
        )
      )
    );
  })
);

benchmarkRunsRouter.get(
  "/:runId",
  validateRequest({ params: benchmarkRunIdParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(ok(await getBenchmarkRun(request.actor!.userId, request.params.runId!)));
  })
);

benchmarkRunsRouter.get(
  "/:runId/metrics",
  validateRequest({ params: benchmarkRunIdParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await getBenchmarkRunMetrics(request.actor!.userId, request.params.runId!))
    );
  })
);

benchmarkRunsRouter.post(
  "/:runId/execute",
  validateRequest({ params: benchmarkRunIdParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await executeBenchmarkRun(request.actor!.userId, request.params.runId!))
    );
  })
);

