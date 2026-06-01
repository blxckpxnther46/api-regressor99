import { AppError } from "../../shared/errors/app-error.js";
import {
  activeBaseline,
  demoBudgets,
  demoProject,
  demoRuns,
  demoScenarios,
  demoSuite,
  promoteRunToBaseline
} from "./demo.store.js";
import type { DemoBudgetResult, DemoMetric, DemoRun } from "./demo.types.js";

const mockTargetBaseUrl = process.env.MOCK_TARGET_BASE_URL ?? "http://localhost:4100";

function round(value: number, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function percentile(sortedValues: number[], percentileValue: number) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.ceil((percentileValue / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))] ?? 0;
}

function evaluateLessThanBudget(
  actualValue: number,
  warnThreshold: number,
  failThreshold: number
): DemoBudgetResult {
  if (actualValue >= failThreshold) {
    return "FAIL";
  }

  if (actualValue >= warnThreshold) {
    return "WARN";
  }

  return "PASS";
}

function calculateMetric(
  latencies: number[],
  successCount: number,
  errorCount: number,
  totalDurationMs: number
): DemoMetric {
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const requestCount = successCount + errorCount;
  const totalLatency = latencies.reduce((sum, latency) => sum + latency, 0);
  const durationSeconds = Math.max(totalDurationMs / 1000, 0.001);

  return {
    requestCount,
    successCount,
    errorCount,
    averageLatencyMs: round(totalLatency / Math.max(latencies.length, 1)),
    p50LatencyMs: round(percentile(sortedLatencies, 50)),
    p95LatencyMs: round(percentile(sortedLatencies, 95)),
    p99LatencyMs: round(percentile(sortedLatencies, 99)),
    minLatencyMs: round(sortedLatencies[0] ?? 0),
    maxLatencyMs: round(sortedLatencies[sortedLatencies.length - 1] ?? 0),
    throughputRps: round(requestCount / durationSeconds),
    errorRate: round((errorCount / Math.max(requestCount, 1)) * 100)
  };
}

function decideRun(metrics: DemoMetric): DemoRun["decisionStatus"] {
  const p95Budget = evaluateLessThanBudget(
    metrics.p95LatencyMs,
    demoBudgets.p95LatencyMs.warnThreshold,
    demoBudgets.p95LatencyMs.failThreshold
  );
  const errorBudget = evaluateLessThanBudget(
    metrics.errorRate,
    demoBudgets.errorRate.warnThreshold,
    demoBudgets.errorRate.failThreshold
  );

  const p95ChangePercent =
    ((metrics.p95LatencyMs - activeBaseline.p95LatencyMs) /
      activeBaseline.p95LatencyMs) *
    100;
  const regressionDetected = p95ChangePercent >= 20 || metrics.errorRate > activeBaseline.errorRate;

  if (p95Budget === "FAIL" || errorBudget === "FAIL") {
    return "FAILED";
  }

  if (regressionDetected) {
    return "NEEDS_REVIEW";
  }

  if (p95Budget === "WARN" || errorBudget === "WARN") {
    return "WARNED";
  }

  return "PASSED";
}

export function getDemoDashboard() {
  const latestRun = demoRuns[0] ?? null;
  const openRegressions = demoRuns.filter(
    (run) => run.comparison.regressionDetected && run.decisionStatus !== "PASSED"
  ).length;

  return {
    project: demoProject,
    suite: demoSuite,
    baseline: activeBaseline,
    budgets: demoBudgets,
    scenarios: demoScenarios,
    latestRun,
    runs: demoRuns,
    summary: {
      totalRuns: demoRuns.length,
      openRegressions,
      latestDecision: latestRun?.decisionStatus ?? "NO_RUNS"
    }
  };
}

export async function triggerDemoRun(scenarioId: string) {
  const scenario = demoScenarios.find((item) => item.id === scenarioId);

  if (!scenario) {
    throw new AppError(404, "DEMO_SCENARIO_NOT_FOUND", "Demo scenario not found.");
  }

  const targetUrl = `${mockTargetBaseUrl}${scenario.targetPath}`;
  const latencies: number[] = [];
  let successCount = 0;
  let errorCount = 0;

  try {
    await fetch(targetUrl);
  } catch {
    // Warm-up failures are ignored so measured samples remain focused on the run.
  }

  const runStartedAt = performance.now();

  for (let requestIndex = 0; requestIndex < scenario.requestCount; requestIndex += 1) {
    const requestStartedAt = performance.now();

    try {
      const response = await fetch(targetUrl);
      const latencyMs = performance.now() - requestStartedAt;
      latencies.push(latencyMs);

      if (response.ok) {
        successCount += 1;
      } else {
        errorCount += 1;
      }
    } catch {
      const latencyMs = performance.now() - requestStartedAt;
      latencies.push(latencyMs);
      errorCount += 1;
    }
  }

  const metrics = calculateMetric(
    latencies,
    successCount,
    errorCount,
    performance.now() - runStartedAt
  );

  const p95ChangePercent =
    ((metrics.p95LatencyMs - activeBaseline.p95LatencyMs) /
      activeBaseline.p95LatencyMs) *
    100;
  const errorRateChangePercent =
    metrics.errorRate - activeBaseline.errorRate;
  const regressionDetected =
    p95ChangePercent >= 20 || metrics.errorRate > activeBaseline.errorRate;

  const p95Budget = evaluateLessThanBudget(
    metrics.p95LatencyMs,
    demoBudgets.p95LatencyMs.warnThreshold,
    demoBudgets.p95LatencyMs.failThreshold
  );
  const errorBudget = evaluateLessThanBudget(
    metrics.errorRate,
    demoBudgets.errorRate.warnThreshold,
    demoBudgets.errorRate.failThreshold
  );

  const run: DemoRun = {
    id: `run_${Date.now()}`,
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    targetUrl,
    executionStatus: "COMPLETED",
    decisionStatus: decideRun(metrics),
    metrics,
    baseline: {
      id: activeBaseline.id,
      p95LatencyMs: activeBaseline.p95LatencyMs,
      errorRate: activeBaseline.errorRate,
      versionNumber: activeBaseline.versionNumber
    },
    comparison: {
      p95ChangePercent: round(p95ChangePercent),
      errorRateChangePercent: round(errorRateChangePercent),
      regressionDetected,
      regressionReason: regressionDetected
        ? "Current run is meaningfully worse than the active baseline."
        : "Current run is within the expected baseline range."
    },
    budgetEvaluation: {
      p95: p95Budget,
      errorRate: errorBudget,
      finalResult:
        p95Budget === "FAIL" || errorBudget === "FAIL"
          ? "FAIL"
          : p95Budget === "WARN" || errorBudget === "WARN"
            ? "WARN"
            : "PASS"
    },
    createdAt: new Date().toISOString()
  };

  demoRuns.unshift(run);
  return run;
}

export function getDemoRun(runId: string) {
  const run = demoRuns.find((item) => item.id === runId);

  if (!run) {
    throw new AppError(404, "DEMO_RUN_NOT_FOUND", "Demo benchmark run not found.");
  }

  return run;
}

export function promoteDemoBaseline(runId: string, reason: string) {
  const run = getDemoRun(runId);

  if (run.executionStatus !== "COMPLETED") {
    throw new AppError(
      409,
      "DEMO_RUN_NOT_COMPLETED",
      "Only completed runs can be promoted to baseline."
    );
  }

  return promoteRunToBaseline(run, reason);
}
