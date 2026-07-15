import { Prisma, TriggerSource } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { runInTransaction } from "../../db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ActivityAction } from "../activity-logs/activity-logs.service.js";
import {
  assertApiKeyProjectAccess,
  assertApiKeyScope,
  authenticateApiKey
} from "../api-keys/api-keys.service.js";
import { assertVerifiedTarget } from "../benchmark-runs/benchmark-runs.service.js";

const ciCdRunSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  suiteId: true,
  suiteVersionId: true,
  deploymentId: true,
  triggeredByApiKeyId: true,
  triggerSource: true,
  environment: true,
  targetBaseUrl: true,
  executionStatus: true,
  createdAt: true
} satisfies Prisma.BenchmarkRunSelect;

type CiCdBenchmarkRunInput = {
  projectId: string;
  suiteId: string;
  environment: string;
  deployment?: {
    commitSha?: string;
    branch?: string;
    version?: string;
    deployReference?: string;
    deployedAt?: Date;
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
};

export async function createCiCdBenchmarkRun(
  rawApiKey: string,
  input: CiCdBenchmarkRunInput
) {
  const apiKey = await authenticateApiKey(rawApiKey);
  assertApiKeyScope(apiKey.scopes, "benchmark_runs:create");
  assertApiKeyProjectAccess(apiKey, input.projectId);

  if (input.deployment) {
    assertApiKeyScope(apiKey.scopes, "deployments:create");
  }

  const suite = await prisma.benchmarkSuite.findFirst({
    where: {
      id: input.suiteId,
      projectId: input.projectId,
      organizationId: apiKey.organizationId,
      isActive: true
    },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      targetBaseUrl: true,
      versions: {
        select: { id: true },
        orderBy: { versionNumber: "desc" },
        take: 1
      }
    }
  });

  if (!suite || suite.versions.length === 0) {
    throw new AppError(404, "BENCHMARK_SUITE_NOT_FOUND", "Benchmark suite not found.");
  }

  await assertVerifiedTarget(suite.projectId, suite.targetBaseUrl);

  return runInTransaction(async (tx) => {
    const deployment = input.deployment
      ? await tx.deployment.create({
          data: {
            organizationId: suite.organizationId,
            projectId: suite.projectId,
            environment: input.environment,
            commitSha: input.deployment.commitSha,
            branch: input.deployment.branch,
            version: input.deployment.version,
            deployReference: input.deployment.deployReference,
            deployedAt: input.deployment.deployedAt ?? new Date(),
            metadata: input.deployment.metadata as Prisma.InputJsonObject | undefined
          },
          select: { id: true }
        })
      : null;

    const run = await tx.benchmarkRun.create({
      data: {
        organizationId: suite.organizationId,
        projectId: suite.projectId,
        suiteId: suite.id,
        suiteVersionId: suite.versions[0]!.id,
        deploymentId: deployment?.id,
        triggeredByApiKeyId: apiKey.id,
        triggerSource: TriggerSource.CI_CD,
        environment: input.environment,
        targetBaseUrl: suite.targetBaseUrl,
        metadata: input.metadata as Prisma.InputJsonObject | undefined
      },
      select: ciCdRunSelect
    });

    await tx.activityLog.create({
      data: {
        organizationId: suite.organizationId,
        actorApiKeyId: apiKey.id,
        action: ActivityAction.CiRunTriggered,
        entityType: "benchmark_run",
        entityId: run.id,
        metadata: {
          suiteId: suite.id,
          projectId: suite.projectId,
          deploymentId: deployment?.id
        }
      }
    });

    return run;
  });
}

export function readBearerToken(authorization: string | undefined) {
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    throw new AppError(401, "API_KEY_REQUIRED", "API key required.");
  }

  return token;
}

