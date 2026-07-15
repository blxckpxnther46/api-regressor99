import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  addMember,
  getOrganization,
  listMembers,
  listOrganizations,
  removeMember,
  updateMemberRole
} from "./organizations.service.js";
import {
  addMemberSchema,
  memberParamsSchema,
  organizationParamsSchema,
  updateMemberSchema
} from "./organizations.schemas.js";
import { activityLogsRouter } from "../activity-logs/activity-logs.routes.js";

export const organizationsRouter = Router();

organizationsRouter.use(requireAuth);

organizationsRouter.use("/:organizationId/activity-logs", activityLogsRouter);

function organizationId(request: Parameters<Parameters<typeof asyncHandler>[0]>[0]) {
  return request.params.organizationId as string;
}

function memberRouteParams(request: Parameters<Parameters<typeof asyncHandler>[0]>[0]) {
  return request.params as { organizationId: string; memberId: string };
}

organizationsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    response.json(ok(await listOrganizations(request.actor!.userId)));
  })
);

organizationsRouter.get(
  "/:organizationId",
  validateRequest({ params: organizationParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await getOrganization(request.actor!.userId, organizationId(request)))
    );
  })
);

organizationsRouter.get(
  "/:organizationId/members",
  validateRequest({ params: organizationParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await listMembers(request.actor!.userId, organizationId(request)))
    );
  })
);

organizationsRouter.post(
  "/:organizationId/members",
  validateRequest({ params: organizationParamsSchema, body: addMemberSchema }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(
        await addMember(
          request.actor!.userId,
          organizationId(request),
          request.body
        )
      )
    );
  })
);

organizationsRouter.patch(
  "/:organizationId/members/:memberId",
  validateRequest({ params: memberParamsSchema, body: updateMemberSchema }),
  asyncHandler(async (request, response) => {
    const params = memberRouteParams(request);

    response.json(
      ok(
        await updateMemberRole(
          request.actor!.userId,
          params.organizationId,
          params.memberId,
          request.body.role
        )
      )
    );
  })
);

organizationsRouter.delete(
  "/:organizationId/members/:memberId",
  validateRequest({ params: memberParamsSchema }),
  asyncHandler(async (request, response) => {
    const params = memberRouteParams(request);

    response.json(
      ok(
        await removeMember(
          request.actor!.userId,
          params.organizationId,
          params.memberId
        )
      )
    );
  })
);
