import { ExecutionStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { runInTransaction } from "../../db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMembership } from "../organizations/organizations.service.js";

const baselineMetricSelect = {
  id: true,
  organizationId: true,
  baselineId: true,
  endpointId: true,
  requestCount: true,
  averageLatencyMs: true,
  p50LatencyMs: true,
  p95LatencyMs: true,
  p99LatencyMs: true,
  throughputRps: true,
  errorRate: true,
  createdAt: true
} satisfies Prisma.BaselineMetricSelect;

const baselineSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  suiteId: true,
  suiteVersionId: true,
  sourceRunId: true,
  environment: true,
  versionNumber: true,
  isActive: true,
  reason: true,
  promotedByUserId: true,
  activeFrom: true,
  activeTo: true,
  metrics: {
    select: baselineMetricSelect,
    orderBy: { createdAt: "asc" }
  },
  createdAt: true
} satisfies Prisma.BaselineSelect;

export async function getActiveBaseline(
  userId: string,
  suiteId: string,
  environment: string
) {
  const suite = await getAccessibleSuite(userId, suiteId);
  const baseline = await prisma.baseline.findFirst({
    where: { suiteId: suite.id, environment, isActive: true },
    select: baselineSelect
  });

  if (!baseline) {
    throw new AppError(404, "BASELINE_NOT_FOUND", "Active baseline not found.");
  }

  return baseline;
}

export async function promoteRunToBaseline(
  userId: string,
  runId: string,
  input: { reason: string }
) {
  const run = await prisma.benchmarkRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      suiteId: true,
      suiteVersionId: true,
      environment: true,
      executionStatus: true,
      metrics: {
        select: {
          endpointId: true,
          requestCount: true,
          averageLatencyMs: true,
          p50LatencyMs: true,
          p95LatencyMs: true,
          p99LatencyMs: true,
          throughputRps: true,
          errorRate: true
        }
      }
    }
  });

  if (!run) {
    throw new AppError(404, "BENCHMARK_RUN_NOT_FOUND", "Benchmark run not found.");
  }

  await requireBaselinePromoter(userId, run.organizationId);

  if (run.executionStatus !== ExecutionStatus.COMPLETED) {
    throw new AppError(
      409,
      "BASELINE_RUN_NOT_COMPLETED",
      "Only completed runs can be promoted to baseline."
    );
  }

  if (run.metrics.length === 0) {
    throw new AppError(
      409,
      "BASELINE_RUN_HAS_NO_METRICS",
      "Run must have metrics before baseline promotion."
    );
  }

  return runInTransaction(async (tx) => {
    const now = new Date();

    await tx.baseline.updateMany({
      where: { suiteId: run.suiteId, environment: run.environment, isActive: true },
      data: { isActive: false, activeTo: now }
    });

    const latest = await tx.baseline.findFirst({
      where: { suiteId: run.suiteId, environment: run.environment },
      select: { versionNumber: true },
      orderBy: { versionNumber: "desc" }
    });

    const baseline = await tx.baseline.create({
      data: {
        organizationId: run.organizationId,
        projectId: run.projectId,
        suiteId: run.suiteId,
        suiteVersionId: run.suiteVersionId,
        sourceRunId: run.id,
        environment: run.environment,
        versionNumber: nextBaselineVersionNumber(latest?.versionNumber),
        reason: input.reason,
        promotedByUserId: userId,
        activeFrom: now
      },
      select: { id: true }
    });

    await tx.baselineMetric.createMany({
      data: run.metrics.map((metric) => ({
        organizationId: run.organizationId,
        baselineId: baseline.id,
        endpointId: metric.endpointId,
        requestCount: metric.requestCount,
        averageLatencyMs: metric.averageLatencyMs,
        p50LatencyMs: metric.p50LatencyMs,
        p95LatencyMs: metric.p95LatencyMs,
        p99LatencyMs: metric.p99LatencyMs,
        throughputRps: metric.throughputRps,
        errorRate: metric.errorRate
      }))
    });

    return tx.baseline.findUniqueOrThrow({
      where: { id: baseline.id },
      select: baselineSelect
    });
  });
}

export function nextBaselineVersionNumber(currentLatest?: number) {
  return (currentLatest ?? 0) + 1;
}

async function getAccessibleSuite(userId: string, suiteId: string) {
  const suite = await prisma.benchmarkSuite.findUnique({
    where: { id: suiteId },
    select: { id: true, organizationId: true, isActive: true }
  });

  if (!suite || !suite.isActive) {
    throw new AppError(404, "BENCHMARK_SUITE_NOT_FOUND", "Benchmark suite not found.");
  }

  await requireMembership(userId, suite.organizationId);
  return suite;
}

async function requireBaselinePromoter(userId: string, organizationId: string) {
  const membership = await requireMembership(userId, organizationId);

  if (!["OWNER", "ADMIN", "DEVELOPER"].includes(membership.role)) {
    throw new AppError(
      403,
      "BASELINE_FORBIDDEN",
      "You cannot promote baselines for this project."
    );
  }
}

