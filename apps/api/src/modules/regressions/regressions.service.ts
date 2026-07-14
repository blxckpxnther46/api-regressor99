import {
  BudgetMetric,
  ExecutionStatus,
  Prisma,
  RegressionSeverity,
  RegressionType
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { runInTransaction } from "../../db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMembership } from "../organizations/organizations.service.js";
import { getProject } from "../projects/projects.service.js";

const regressionSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  runId: true,
  baselineId: true,
  endpointId: true,
  deploymentId: true,
  type: true,
  metric: true,
  baselineValue: true,
  currentValue: true,
  changePercent: true,
  severity: true,
  status: true,
  detectedAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.RegressionSelect;

type ComparableMetric = {
  endpointId: string | null;
  p95LatencyMs: number;
  throughputRps: number;
  errorRate: number;
};

type RegressionCandidate = {
  endpointId: string | null;
  type: RegressionType;
  metric: BudgetMetric;
  baselineValue: number;
  currentValue: number;
  changePercent: number;
  severity: RegressionSeverity;
};

export async function listRegressions(
  userId: string,
  projectId: string,
  input: { status?: string }
) {
  const project = await getProject(userId, projectId);

  return prisma.regression.findMany({
    where: {
      projectId: project.id,
      status: input.status as Prisma.EnumRegressionStatusFilter | undefined
    },
    select: regressionSelect,
    orderBy: { createdAt: "desc" }
  });
}

export async function detectRegressionsForRun(userId: string, runId: string) {
  const run = await prisma.benchmarkRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      suiteId: true,
      environment: true,
      deploymentId: true,
      executionStatus: true,
      metrics: {
        select: {
          endpointId: true,
          p95LatencyMs: true,
          throughputRps: true,
          errorRate: true
        }
      }
    }
  });

  if (!run) {
    throw new AppError(404, "BENCHMARK_RUN_NOT_FOUND", "Benchmark run not found.");
  }

  await requireMembership(userId, run.organizationId);

  if (run.executionStatus !== ExecutionStatus.COMPLETED) {
    throw new AppError(
      409,
      "REGRESSION_RUN_NOT_COMPLETED",
      "Only completed runs can be checked for regressions."
    );
  }

  const baseline = await prisma.baseline.findFirst({
    where: {
      suiteId: run.suiteId,
      environment: run.environment,
      isActive: true
    },
    select: {
      id: true,
      metrics: {
        select: {
          endpointId: true,
          p95LatencyMs: true,
          throughputRps: true,
          errorRate: true
        }
      }
    }
  });

  if (!baseline) {
    throw new AppError(404, "BASELINE_NOT_FOUND", "Active baseline not found.");
  }

  const candidates = detectRegressionCandidates(baseline.metrics, run.metrics);

  return runInTransaction(async (tx) => {
    await tx.regression.deleteMany({ where: { runId: run.id } });

    if (candidates.length > 0) {
      await tx.regression.createMany({
        data: candidates.map((candidate) => ({
          organizationId: run.organizationId,
          projectId: run.projectId,
          runId: run.id,
          baselineId: baseline.id,
          endpointId: candidate.endpointId,
          deploymentId: run.deploymentId,
          type: candidate.type,
          metric: candidate.metric,
          baselineValue: candidate.baselineValue,
          currentValue: candidate.currentValue,
          changePercent: candidate.changePercent,
          severity: candidate.severity
        }))
      });
    }

    return tx.regression.findMany({
      where: { runId: run.id },
      select: regressionSelect,
      orderBy: { createdAt: "desc" }
    });
  });
}

export function detectRegressionCandidates(
  baselineMetrics: ComparableMetric[],
  currentMetrics: ComparableMetric[]
) {
  const currentByEndpoint = new Map(
    currentMetrics.map((metric) => [metric.endpointId ?? "suite", metric])
  );
  const regressions: RegressionCandidate[] = [];

  for (const baseline of baselineMetrics) {
    const current = currentByEndpoint.get(baseline.endpointId ?? "suite");

    if (!current) {
      continue;
    }

    const latencyChange = increasePercent(baseline.p95LatencyMs, current.p95LatencyMs);
    if (latencyChange >= 20) {
      regressions.push({
        endpointId: current.endpointId,
        type: RegressionType.LATENCY,
        metric: BudgetMetric.P95_LATENCY,
        baselineValue: baseline.p95LatencyMs,
        currentValue: current.p95LatencyMs,
        changePercent: latencyChange,
        severity: classifySeverity(latencyChange)
      });
    }

    const errorRateChange = increasePercent(baseline.errorRate, current.errorRate);
    if (current.errorRate > baseline.errorRate) {
      regressions.push({
        endpointId: current.endpointId,
        type: RegressionType.ERROR_RATE,
        metric: BudgetMetric.ERROR_RATE,
        baselineValue: baseline.errorRate,
        currentValue: current.errorRate,
        changePercent: errorRateChange,
        severity: classifySeverity(errorRateChange)
      });
    }

    const throughputDrop = decreasePercent(baseline.throughputRps, current.throughputRps);
    if (throughputDrop >= 20) {
      regressions.push({
        endpointId: current.endpointId,
        type: RegressionType.THROUGHPUT,
        metric: BudgetMetric.THROUGHPUT,
        baselineValue: baseline.throughputRps,
        currentValue: current.throughputRps,
        changePercent: throughputDrop,
        severity: classifySeverity(throughputDrop)
      });
    }
  }

  return regressions;
}

export function classifySeverity(changePercent: number) {
  if (changePercent >= 100) {
    return RegressionSeverity.CRITICAL;
  }

  if (changePercent >= 50) {
    return RegressionSeverity.HIGH;
  }

  if (changePercent >= 30) {
    return RegressionSeverity.MEDIUM;
  }

  return RegressionSeverity.LOW;
}

function increasePercent(baselineValue: number, currentValue: number) {
  if (baselineValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return ((currentValue - baselineValue) / baselineValue) * 100;
}

function decreasePercent(baselineValue: number, currentValue: number) {
  if (baselineValue === 0) {
    return 0;
  }

  return ((baselineValue - currentValue) / baselineValue) * 100;
}

