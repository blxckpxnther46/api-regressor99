import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  createPerformanceBudget,
  disablePerformanceBudget,
  getPerformanceBudget,
  listPerformanceBudgets,
  updatePerformanceBudget
} from "./performance-budgets.service.js";
import {
  createPerformanceBudgetSchema,
  listPerformanceBudgetsQuerySchema,
  performanceBudgetIdParamsSchema,
  projectPerformanceBudgetsParamsSchema,
  updatePerformanceBudgetSchema
} from "./performance-budgets.schemas.js";

export const projectPerformanceBudgetsRouter = Router({ mergeParams: true });
export const performanceBudgetsRouter = Router();

projectPerformanceBudgetsRouter.get(
  "/",
  validateRequest({
    params: projectPerformanceBudgetsParamsSchema,
    query: listPerformanceBudgetsQuerySchema
  }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(
        await listPerformanceBudgets(
          request.actor!.userId,
          request.params.projectId!,
          request.query
        )
      )
    );
  })
);

projectPerformanceBudgetsRouter.post(
  "/",
  validateRequest({
    params: projectPerformanceBudgetsParamsSchema,
    body: createPerformanceBudgetSchema
  }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(
        await createPerformanceBudget(
          request.actor!.userId,
          request.params.projectId!,
          request.body
        )
      )
    );
  })
);

performanceBudgetsRouter.use(requireAuth);

performanceBudgetsRouter.get(
  "/:budgetId",
  validateRequest({ params: performanceBudgetIdParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await getPerformanceBudget(request.actor!.userId, request.params.budgetId!))
    );
  })
);

performanceBudgetsRouter.patch(
  "/:budgetId",
  validateRequest({
    params: performanceBudgetIdParamsSchema,
    body: updatePerformanceBudgetSchema
  }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(
        await updatePerformanceBudget(
          request.actor!.userId,
          request.params.budgetId!,
          request.body
        )
      )
    );
  })
);

performanceBudgetsRouter.delete(
  "/:budgetId",
  validateRequest({ params: performanceBudgetIdParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await disablePerformanceBudget(request.actor!.userId, request.params.budgetId!))
    );
  })
);

