import {
  BudgetMetric,
  BudgetResult,
  DecisionStatus,
  ExecutionStatus,
  Prisma
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { runInTransaction } from "../../db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMembership } from "../organizations/organizations.service.js";
import { evaluateBudget } from "../performance-budgets/performance-budgets.service.js";

const decisionRunSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  suiteId: true,
  executionStatus: true,
  decisionStatus: true,
  budgetEvaluations: {
    select: {
      id: true,
      budgetId: true,
      metric: true,
      actualValue: true,
      warnThreshold: true,
      failThreshold: true,
      result: true,
      createdAt: true
    },
    orderBy: { createdAt: "asc" }
  },
  regressions: {
    select: {
      id: true,
      status: true,
      severity: true,
      metric: true,
      changePercent: true
    },
    orderBy: { createdAt: "desc" }
  },
  decisionExceptions: {
    select: {
      id: true,
      reason: true,
      expiresAt: true,
      approvedByUserId: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  },
  updatedAt: true
} satisfies Prisma.BenchmarkRunSelect;

type BudgetEvaluationInput = {
  budgetId: string;
  metric: BudgetMetric;
  actualValue: number;
  warnThreshold: number | null;
  failThreshold: number;
  result: BudgetResult;
  isHard: boolean;
};

export async function decideBenchmarkRun(userId: string, runId: string) {
  const run = await prisma.benchmarkRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      suiteId: true,
      executionStatus: true,
      metrics: {
        select: {
          endpointId: true,
          averageLatencyMs: true,
          p50LatencyMs: true,
          p95LatencyMs: true,
          p99LatencyMs: true,
          throughputRps: true,
          errorRate: true
        }
      },
      regressions: {
        where: { status: "OPEN" },
        select: { id: true }
      },
      decisionExceptions: {
        where: { expiresAt: { gt: new Date() } },
        select: { id: true }
      }
    }
  });

  if (!run) {
    throw new AppError(404, "BENCHMARK_RUN_NOT_FOUND", "Benchmark run not found.");
  }

  await requireMembership(userId, run.organizationId);

  if (run.executionStatus === ExecutionStatus.FAILED) {
    return updateRunDecision(run.id, DecisionStatus.NEEDS_REVIEW);
  }

  if (run.executionStatus !== ExecutionStatus.COMPLETED) {
    throw new AppError(
      409,
      "DECISION_RUN_NOT_COMPLETED",
      "Only completed or failed runs can receive a decision."
    );
  }

  const budgetEvaluations = await evaluateRunBudgets(run);
  const decisionStatus = applyDecisionRules({
    budgetEvaluations,
    hasOpenRegression: run.regressions.length > 0,
    hasActiveException: run.decisionExceptions.length > 0
  });

  return runInTransaction(async (tx) => {
    await tx.budgetEvaluation.deleteMany({ where: { runId: run.id } });

    if (budgetEvaluations.length > 0) {
      await tx.budgetEvaluation.createMany({
        data: budgetEvaluations.map((evaluation) => ({
          organizationId: run.organizationId,
          runId: run.id,
          budgetId: evaluation.budgetId,
          metric: evaluation.metric,
          actualValue: evaluation.actualValue,
          warnThreshold: evaluation.warnThreshold,
          failThreshold: evaluation.failThreshold,
          result: evaluation.result
        }))
      });
    }

    return tx.benchmarkRun.update({
      where: { id: run.id },
      data: { decisionStatus },
      select: decisionRunSelect
    });
  });
}

export function applyDecisionRules(input: {
  budgetEvaluations: Pick<BudgetEvaluationInput, "result" | "isHard">[];
  hasOpenRegression: boolean;
  hasActiveException: boolean;
}) {
  const hardBudgetFailed = input.budgetEvaluations.some(
    (evaluation) => evaluation.result === BudgetResult.FAIL && evaluation.isHard
  );
  const budgetWarned = input.budgetEvaluations.some(
    (evaluation) => evaluation.result === BudgetResult.WARN
  );

  if (hardBudgetFailed) {
    return input.hasActiveException ? DecisionStatus.WARNED : DecisionStatus.FAILED;
  }

  if (input.hasOpenRegression) {
    return input.hasActiveException
      ? DecisionStatus.WARNED
      : DecisionStatus.NEEDS_REVIEW;
  }

  if (budgetWarned) {
    return DecisionStatus.WARNED;
  }

  return DecisionStatus.PASSED;
}

async function evaluateRunBudgets(run: {
  projectId: string;
  suiteId: string;
  metrics: Array<{
    endpointId: string | null;
    averageLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    throughputRps: number;
    errorRate: number;
  }>;
}) {
  const budgets = await prisma.performanceBudget.findMany({
    where: {
      projectId: run.projectId,
      isEnabled: true,
      OR: [{ suiteId: null }, { suiteId: run.suiteId }]
    },
    select: {
      id: true,
      endpointId: true,
      metric: true,
      operator: true,
      warnThreshold: true,
      failThreshold: true,
      isHard: true
    }
  });

  return budgets.flatMap((budget) => {
    const metric = run.metrics.find(
      (runMetric) => (runMetric.endpointId ?? null) === (budget.endpointId ?? null)
    );

    if (!metric) {
      return [];
    }

    const actualValue = metricValue(metric, budget.metric);
    return [
      {
        budgetId: budget.id,
        metric: budget.metric,
        actualValue,
        warnThreshold: budget.warnThreshold,
        failThreshold: budget.failThreshold,
        isHard: budget.isHard,
        result: evaluateBudget({
          actualValue,
          operator: budget.operator,
          warnThreshold: budget.warnThreshold,
          failThreshold: budget.failThreshold
        })
      }
    ];
  });
}

function updateRunDecision(runId: string, decisionStatus: DecisionStatus) {
  return prisma.benchmarkRun.update({
    where: { id: runId },
    data: { decisionStatus },
    select: decisionRunSelect
  });
}

function metricValue(
  metric: {
    averageLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    throughputRps: number;
    errorRate: number;
  },
  budgetMetric: BudgetMetric
) {
  switch (budgetMetric) {
    case BudgetMetric.AVERAGE_LATENCY:
      return metric.averageLatencyMs;
    case BudgetMetric.P50_LATENCY:
      return metric.p50LatencyMs;
    case BudgetMetric.P95_LATENCY:
      return metric.p95LatencyMs;
    case BudgetMetric.P99_LATENCY:
      return metric.p99LatencyMs;
    case BudgetMetric.THROUGHPUT:
      return metric.throughputRps;
    case BudgetMetric.ERROR_RATE:
      return metric.errorRate;
  }
}

