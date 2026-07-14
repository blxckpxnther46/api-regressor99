import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { decideBenchmarkRun } from "./decision-engine.service.js";
import { decideRunParamsSchema } from "./decision-engine.schemas.js";

export const decisionEngineRouter = Router();

decisionEngineRouter.use(requireAuth);

decisionEngineRouter.post(
  "/:runId/decide",
  validateRequest({ params: decideRunParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(ok(await decideBenchmarkRun(request.actor!.userId, request.params.runId!)));
  })
);

