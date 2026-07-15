import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { approveDecisionException } from "./decision-exceptions.service.js";
import {
  approveDecisionExceptionSchema,
  decisionExceptionRunParamsSchema
} from "./decision-exceptions.schemas.js";

export const decisionExceptionsRouter = Router();

decisionExceptionsRouter.use(requireAuth);

decisionExceptionsRouter.post(
  "/:runId/exceptions",
  validateRequest({
    params: decisionExceptionRunParamsSchema,
    body: approveDecisionExceptionSchema
  }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(
        await approveDecisionException(
          request.actor!.userId,
          request.params.runId!,
          request.body
        )
      )
    );
  })
);

