import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  getActiveBaseline,
  promoteRunToBaseline
} from "./baselines.service.js";
import {
  activeBaselineQuerySchema,
  promoteBaselineParamsSchema,
  promoteBaselineSchema,
  suiteBaselineParamsSchema
} from "./baselines.schemas.js";

export const suiteBaselinesRouter = Router({ mergeParams: true });
export const runBaselinePromotionRouter = Router();

suiteBaselinesRouter.use(requireAuth);
runBaselinePromotionRouter.use(requireAuth);

suiteBaselinesRouter.get(
  "/:suiteId/baselines/active",
  validateRequest({
    params: suiteBaselineParamsSchema,
    query: activeBaselineQuerySchema
  }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(
        await getActiveBaseline(
          request.actor!.userId,
          request.params.suiteId!,
          request.query.environment as string
        )
      )
    );
  })
);

runBaselinePromotionRouter.post(
  "/:runId/promote-baseline",
  validateRequest({
    params: promoteBaselineParamsSchema,
    body: promoteBaselineSchema
  }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(
        await promoteRunToBaseline(
          request.actor!.userId,
          request.params.runId!,
          request.body
        )
      )
    );
  })
);

