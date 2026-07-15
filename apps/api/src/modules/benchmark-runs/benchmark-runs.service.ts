import { ExecutionStatus, Prisma, TriggerSource } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { runInTransaction } from "../../db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ActivityAction, logActivity } from "../activity-logs/activity-logs.service.js";
import { requireMembership } from "../organizations/organizations.service.js";
import { assertSafeTarget } from "../target-verification/target-verification.service.js";
import { executeInternalHttpRun } from "../runner/internal-http-adapter.js";

const benchmarkRunSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  suiteId: true,
  suiteVersionId: true,
  deploymentId: true,
  triggeredByUserId: true,
  triggerSource: true,
  environment: true,
  targetBaseUrl: true,
  executionStatus: true,
  decisionStatus: true,
  startedAt: true,
  finishedAt: true,
  failureReason: true,
  metadata: true,
  metrics: {
    select: {
      id: true,
      endpointId: true,
      requestCount: true,
      successCount: true,
      errorCount: true,
      averageLatencyMs: true,
      p50LatencyMs: true,
      p95LatencyMs: true,
      p99LatencyMs: true,
      minLatencyMs: true,
      maxLatencyMs: true,
      throughputRps: true,
      errorRate: true,
      createdAt: true
    },
    orderBy: { createdAt: "asc" }
  },
  createdAt: true,
  updatedAt: true
} satisfies Prisma.BenchmarkRunSelect;

type CreateBenchmarkRunInput = {
  deploymentId?: string;
  environment: string;
  metadata?: Record<string, unknown>;
};

export async function createBenchmarkRun(
  userId: string,
  suiteId: string,
  input: CreateBenchmarkRunInput
) {
  const suite = await getRunnableSuite(userId, suiteId);
  await requireRunnerRole(userId, suite.organizationId);
  await assertVerifiedTarget(suite.projectId, suite.targetBaseUrl);

  if (input.deploymentId) {
    await assertDeploymentScope(suite.projectId, input.deploymentId);
  }

  const run = await prisma.benchmarkRun.create({
    data: {
      organizationId: suite.organizationId,
      projectId: suite.projectId,
      suiteId: suite.id,
      suiteVersionId: suite.versions[0]!.id,
      deploymentId: input.deploymentId,
      triggeredByUserId: userId,
      triggerSource: TriggerSource.MANUAL,
      environment: input.environment,
      targetBaseUrl: suite.targetBaseUrl,
      metadata: input.metadata as Prisma.InputJsonObject | undefined
    },
    select: benchmarkRunSelect
  });

  await logActivity({
    organizationId: run.organizationId,
    actorUserId: userId,
    action: ActivityAction.RunTriggered,
    entityType: "benchmark_run",
    entityId: run.id,
    metadata: { suiteId: run.suiteId, environment: run.environment }
  });

  return run;
}

export async function getBenchmarkRun(userId: string, runId: string) {
  const run = await prisma.benchmarkRun.findUnique({
    where: { id: runId },
    select: benchmarkRunSelect
  });

  if (!run) {
    throw new AppError(404, "BENCHMARK_RUN_NOT_FOUND", "Benchmark run not found.");
  }

  await requireMembership(userId, run.organizationId);
  return run;
}

export async function getBenchmarkRunMetrics(userId: string, runId: string) {
  const run = await getBenchmarkRun(userId, runId);
  return run.metrics;
}

export async function executeBenchmarkRun(userId: string, runId: string) {
  const run = await getExecutableRun(userId, runId);

  await prisma.benchmarkRun.update({
    where: { id: run.id },
    data: {
      executionStatus: ExecutionStatus.RUNNING,
      startedAt: new Date(),
      failureReason: null
    }
  });

  try {
    await assertSafeTarget(run.targetBaseUrl);
    const metrics = await executeInternalHttpRun({
      targetBaseUrl: run.targetBaseUrl,
      loadProfile: run.suiteVersion.loadProfile,
      endpoints: run.suiteVersion.endpoints
    });

    return runInTransaction(async (tx) => {
      await tx.benchmarkRunMetric.createMany({
        data: metrics.map((metric) => ({
          organizationId: run.organizationId,
          runId: run.id,
          endpointId: metric.endpointId,
          requestCount: metric.requestCount,
          successCount: metric.successCount,
          errorCount: metric.errorCount,
          averageLatencyMs: metric.averageLatencyMs,
          p50LatencyMs: metric.p50LatencyMs,
          p95LatencyMs: metric.p95LatencyMs,
          p99LatencyMs: metric.p99LatencyMs,
          minLatencyMs: metric.minLatencyMs,
          maxLatencyMs: metric.maxLatencyMs,
          throughputRps: metric.throughputRps,
          errorRate: metric.errorRate
        }))
      });

      const completedRun = await tx.benchmarkRun.update({
        where: { id: run.id },
        data: {
          executionStatus: ExecutionStatus.COMPLETED,
          finishedAt: new Date()
        },
        select: benchmarkRunSelect
      });

      await tx.activityLog.create({
        data: {
          organizationId: run.organizationId,
          actorUserId: userId,
          action: ActivityAction.RunCompleted,
          entityType: "benchmark_run",
          entityId: run.id,
          metadata: { metricCount: metrics.length }
        }
      });

      return completedRun;
    });
  } catch (error) {
    const failureReason = error instanceof Error ? error.message : "Benchmark run failed.";
    await prisma.benchmarkRun.update({
      where: { id: run.id },
      data: {
        executionStatus: ExecutionStatus.FAILED,
        finishedAt: new Date(),
        failureReason
      }
    });

    await prisma.activityLog.create({
      data: {
        organizationId: run.organizationId,
        actorUserId: userId,
        action: ActivityAction.RunCompleted,
        entityType: "benchmark_run",
        entityId: run.id,
        metadata: { status: "failed", error: failureReason }
      }
    });

    throw error;
  }
}

async function getRunnableSuite(userId: string, suiteId: string) {
  const suite = await prisma.benchmarkSuite.findUnique({
    where: { id: suiteId },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      targetBaseUrl: true,
      isActive: true,
      versions: {
        select: { id: true },
        orderBy: { versionNumber: "desc" },
        take: 1
      }
    }
  });

  if (!suite || !suite.isActive || suite.versions.length === 0) {
    throw new AppError(404, "BENCHMARK_SUITE_NOT_FOUND", "Benchmark suite not found.");
  }

  await requireMembership(userId, suite.organizationId);
  return suite;
}

async function getExecutableRun(userId: string, runId: string) {
  const run = await prisma.benchmarkRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      organizationId: true,
      targetBaseUrl: true,
      executionStatus: true,
      suiteVersion: {
        select: {
          loadProfile: true,
          endpoints: {
            select: {
              id: true,
              method: true,
              path: true,
              headers: true,
              queryParams: true,
              body: true,
              expectedStatus: true,
              timeoutMs: true
            },
            orderBy: { createdAt: "asc" }
          }
        }
      }
    }
  });

  if (!run) {
    throw new AppError(404, "BENCHMARK_RUN_NOT_FOUND", "Benchmark run not found.");
  }

  await requireRunnerRole(userId, run.organizationId);

  if (run.executionStatus !== ExecutionStatus.QUEUED) {
    throw new AppError(409, "BENCHMARK_RUN_NOT_QUEUED", "Only queued runs can be executed.");
  }

  return run;
}

async function requireRunnerRole(userId: string, organizationId: string) {
  const membership = await requireMembership(userId, organizationId);

  if (!["OWNER", "ADMIN", "DEVELOPER"].includes(membership.role)) {
    throw new AppError(
      403,
      "BENCHMARK_RUN_FORBIDDEN",
      "You cannot run benchmarks for this project."
    );
  }
}

async function assertVerifiedTarget(projectId: string, targetBaseUrl: string) {
  await assertSafeTarget(targetBaseUrl);
  const verifications = await prisma.targetVerification.findMany({
    where: { projectId, status: "VERIFIED" },
    select: { targetBaseUrl: true }
  });
  const targetOrigin = new URL(targetBaseUrl).origin;
  const isVerified = verifications.some(
    (verification) => new URL(verification.targetBaseUrl).origin === targetOrigin
  );

  if (!isVerified) {
    throw new AppError(
      409,
      "TARGET_NOT_VERIFIED",
      "Target must be verified before running benchmarks."
    );
  }
}

async function assertDeploymentScope(projectId: string, deploymentId: string) {
  const deployment = await prisma.deployment.findFirst({
    where: { id: deploymentId, projectId },
    select: { id: true }
  });

  if (!deployment) {
    throw new AppError(400, "DEPLOYMENT_SCOPE_INVALID", "Deployment does not belong to this project.");
  }
}
