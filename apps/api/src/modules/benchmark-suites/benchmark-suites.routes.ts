import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  archiveBenchmarkSuite,
  createBenchmarkSuite,
  createBenchmarkSuiteVersion,
  getBenchmarkSuite,
  listBenchmarkSuites
} from "./benchmark-suites.service.js";
import {
  benchmarkSuiteIdParamsSchema,
  createBenchmarkSuiteSchema,
  createBenchmarkSuiteVersionSchema,
  projectBenchmarkSuitesParamsSchema
} from "./benchmark-suites.schemas.js";

export const projectBenchmarkSuitesRouter = Router({ mergeParams: true });
export const benchmarkSuitesRouter = Router();

projectBenchmarkSuitesRouter.get(
  "/",
  validateRequest({ params: projectBenchmarkSuitesParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await listBenchmarkSuites(request.actor!.userId, request.params.projectId!))
    );
  })
);

projectBenchmarkSuitesRouter.post(
  "/",
  validateRequest({
    params: projectBenchmarkSuitesParamsSchema,
    body: createBenchmarkSuiteSchema
  }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(
        await createBenchmarkSuite(
          request.actor!.userId,
          request.params.projectId!,
          request.body
        )
      )
    );
  })
);

benchmarkSuitesRouter.use(requireAuth);

benchmarkSuitesRouter.get(
  "/:suiteId",
  validateRequest({ params: benchmarkSuiteIdParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(ok(await getBenchmarkSuite(request.actor!.userId, request.params.suiteId!)));
  })
);

benchmarkSuitesRouter.post(
  "/:suiteId/versions",
  validateRequest({
    params: benchmarkSuiteIdParamsSchema,
    body: createBenchmarkSuiteVersionSchema
  }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(
        await createBenchmarkSuiteVersion(
          request.actor!.userId,
          request.params.suiteId!,
          request.body
        )
      )
    );
  })
);

benchmarkSuitesRouter.delete(
  "/:suiteId",
  validateRequest({ params: benchmarkSuiteIdParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await archiveBenchmarkSuite(request.actor!.userId, request.params.suiteId!))
    );
  })
);

