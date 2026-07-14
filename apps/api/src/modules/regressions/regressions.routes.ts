import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  detectRegressionsForRun,
  listRegressions
} from "./regressions.service.js";
import {
  detectRegressionsParamsSchema,
  listRegressionsQuerySchema,
  projectRegressionsParamsSchema
} from "./regressions.schemas.js";

export const projectRegressionsRouter = Router({ mergeParams: true });
export const runRegressionsRouter = Router();

projectRegressionsRouter.use(requireAuth);
runRegressionsRouter.use(requireAuth);

projectRegressionsRouter.get(
  "/",
  validateRequest({
    params: projectRegressionsParamsSchema,
    query: listRegressionsQuerySchema
  }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(
        await listRegressions(
          request.actor!.userId,
          request.params.projectId!,
          request.query
        )
      )
    );
  })
);

runRegressionsRouter.post(
  "/:runId/detect-regressions",
  validateRequest({ params: detectRegressionsParamsSchema }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(await detectRegressionsForRun(request.actor!.userId, request.params.runId!))
    );
  })
);

