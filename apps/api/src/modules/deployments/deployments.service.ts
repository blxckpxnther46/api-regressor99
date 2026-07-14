import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMembership } from "../organizations/organizations.service.js";
import { getProject } from "../projects/projects.service.js";

const deploymentSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  environment: true,
  commitSha: true,
  branch: true,
  version: true,
  deployReference: true,
  deployedAt: true,
  metadata: true,
  createdAt: true
} satisfies Prisma.DeploymentSelect;

type CreateDeploymentInput = {
  environment: string;
  commitSha?: string;
  branch?: string;
  version?: string;
  deployReference?: string;
  deployedAt?: Date;
  metadata?: Record<string, unknown>;
};

type ListDeploymentsInput = {
  environment?: string;
};

export async function createDeployment(
  userId: string,
  projectId: string,
  input: CreateDeploymentInput
) {
  const project = await getProject(userId, projectId);
  const membership = await requireMembership(userId, project.organizationId);

  if (!["OWNER", "ADMIN", "DEVELOPER"].includes(membership.role)) {
    throw new AppError(
      403,
      "DEPLOYMENT_FORBIDDEN",
      "You cannot create deployments for this project."
    );
  }

  return prisma.deployment.create({
    data: {
      organizationId: project.organizationId,
      projectId: project.id,
      environment: input.environment,
      commitSha: input.commitSha,
      branch: input.branch,
      version: input.version,
      deployReference: input.deployReference,
      deployedAt: input.deployedAt ?? new Date(),
      metadata: input.metadata as Prisma.InputJsonObject | undefined
    },
    select: deploymentSelect
  });
}

export async function listDeployments(
  userId: string,
  projectId: string,
  input: ListDeploymentsInput
) {
  const project = await getProject(userId, projectId);

  return prisma.deployment.findMany({
    where: {
      projectId: project.id,
      environment: input.environment
    },
    select: deploymentSelect,
    orderBy: { deployedAt: "desc" }
  });
}

export async function getDeployment(userId: string, deploymentId: string) {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
    select: deploymentSelect
  });

  if (!deployment) {
    throw new AppError(404, "DEPLOYMENT_NOT_FOUND", "Deployment not found.");
  }

  await requireMembership(userId, deployment.organizationId);

  return deployment;
}

