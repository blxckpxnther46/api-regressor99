import { z } from "zod";

export const deploymentIdParamsSchema = z.object({
  deploymentId: z.string().min(1)
});

export const projectDeploymentsParamsSchema = z.object({
  projectId: z.string().min(1)
});

export const listDeploymentsQuerySchema = z.object({
  environment: z.string().trim().min(1).optional()
});

export const createDeploymentSchema = z.object({
  environment: z.string().trim().min(1).max(100),
  commitSha: z.string().trim().min(1).max(100).optional(),
  branch: z.string().trim().min(1).max(200).optional(),
  version: z.string().trim().min(1).max(100).optional(),
  deployReference: z.string().trim().min(1).max(200).optional(),
  deployedAt: z.coerce.date().optional(),
  metadata: z.record(z.unknown()).optional()
});

