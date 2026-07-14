import { Router } from "express";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  createDeployment,
  getDeployment,
  listDeployments
} from "./deployments.service.js";
import {
  createDeploymentSchema,
  deploymentIdParamsSchema,
  listDeploymentsQuerySchema,
  projectDeploymentsParamsSchema
} from "./deployments.schemas.js";

export const projectDeploymentsRouter = Router({ mergeParams: true });
export const deploymentsRouter = Router();

projectDeploymentsRouter.get(
  "/",
  validateRequest({
    params: projectDeploymentsParamsSchema,
    query: listDeploymentsQuerySchema
  }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(
        await listDeployments(
          request.actor!.userId,
          request.params.projectId!,
          request.query
        )
      )
    );
  })
);

projectDeploymentsRouter.post(
  "/",
  validateRequest({
    params: projectDeploymentsParamsSchema,
    body: createDeploymentSchema
  }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(
        await createDeployment(
          request.actor!.userId,
          request.params.projectId!,
          request.body
        )
      )
    );
  })
);

deploymentsRouter.use(requireAuth);

deploymentsRouter.get(
  "/:deploymentId",
  validateRequest({ params: deploymentIdParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await getDeployment(request.actor!.userId, request.params.deploymentId!))
    );
  })
);

