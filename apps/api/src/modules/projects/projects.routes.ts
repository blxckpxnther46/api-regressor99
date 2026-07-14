import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { validateRequest } from "../../middleware/validate-request.js";
import { ok } from "../../shared/http/api-response.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import {
  archiveProject,
  createProject,
  getProject,
  listProjects,
  updateProject
} from "./projects.service.js";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectIdParamsSchema,
  updateProjectSchema
} from "./projects.schemas.js";
import { projectBenchmarkSuitesRouter } from "../benchmark-suites/benchmark-suites.routes.js";
import { projectDeploymentsRouter } from "../deployments/deployments.routes.js";
import { projectPerformanceBudgetsRouter } from "../performance-budgets/performance-budgets.routes.js";
import { targetVerificationRouter } from "../target-verification/target-verification.routes.js";

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

type ListProjectsQuery = {
  organizationId: string;
  includeArchived?: boolean;
};

projectsRouter.get(
  "/",
  validateRequest({ query: listProjectsQuerySchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(
        await listProjects(
          request.actor!.userId,
          request.query as unknown as ListProjectsQuery
        )
      )
    );
  })
);

projectsRouter.post(
  "/",
  validateRequest({ body: createProjectSchema }),
  asyncHandler(async (request, response) => {
    response.status(201).json(
      ok(await createProject(request.actor!.userId, request.body))
    );
  })
);

projectsRouter.use("/:projectId/target-verification", targetVerificationRouter);
projectsRouter.use("/:projectId/deployments", projectDeploymentsRouter);
projectsRouter.use("/:projectId/benchmark-suites", projectBenchmarkSuitesRouter);
projectsRouter.use("/:projectId/performance-budgets", projectPerformanceBudgetsRouter);

projectsRouter.get(
  "/:projectId",
  validateRequest({ params: projectIdParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(ok(await getProject(request.actor!.userId, request.params.projectId!)));
  })
);

projectsRouter.patch(
  "/:projectId",
  validateRequest({ params: projectIdParamsSchema, body: updateProjectSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(
        await updateProject(
          request.actor!.userId,
          request.params.projectId!,
          request.body
        )
      )
    );
  })
);

projectsRouter.delete(
  "/:projectId",
  validateRequest({ params: projectIdParamsSchema }),
  asyncHandler(async (request, response) => {
    response.json(
      ok(await archiveProject(request.actor!.userId, request.params.projectId!))
    );
  })
);
