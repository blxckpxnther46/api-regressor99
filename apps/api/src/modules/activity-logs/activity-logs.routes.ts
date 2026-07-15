import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { listActivityLogs } from "./activity-logs.service.js";
import {
  activityLogsParamsSchema,
  activityLogsQuerySchema
} from "./activity-logs.schemas.js";

export const activityLogsRouter = Router({ mergeParams: true });

activityLogsRouter.use(requireAuth);

activityLogsRouter.get(
  "/",
  validateRequest({
    params: activityLogsParamsSchema,
    query: activityLogsQuerySchema
  }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(
        await listActivityLogs(
          request.actor!.userId,
          request.params.organizationId!,
          request.query
        )
      )
    );
  })
);

