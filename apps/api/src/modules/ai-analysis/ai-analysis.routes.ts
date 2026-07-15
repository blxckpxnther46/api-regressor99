import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { runAiAnalysisParamsSchema } from "./ai-analysis.schemas.js";
import {
  generateRunAiAnalysis,
  listRunAiAnalyses
} from "./ai-analysis.service.js";

export const runAiAnalysisRouter = Router();

runAiAnalysisRouter.use(requireAuth);

runAiAnalysisRouter.get(
  "/:runId/ai-analysis",
  validateRequest({ params: runAiAnalysisParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await listRunAiAnalyses(request.actor!.userId, request.params.runId!))
    );
  })
);

runAiAnalysisRouter.post(
  "/:runId/ai-analysis",
  validateRequest({ params: runAiAnalysisParamsSchema }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(await generateRunAiAnalysis(request.actor!.userId, request.params.runId!))
    );
  })
);

