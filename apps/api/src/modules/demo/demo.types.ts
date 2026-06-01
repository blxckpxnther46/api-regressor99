export type DemoDecisionStatus =
  | "PASSED"
  | "WARNED"
  | "FAILED"
  | "NEEDS_REVIEW";

export type DemoBudgetResult = "PASS" | "WARN" | "FAIL";

export type DemoScenario = {
  id: string;
  name: string;
  description: string;
  targetPath: string;
  requestCount: number;
};

export type DemoMetric = {
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  throughputRps: number;
  errorRate: number;
};

export type DemoRun = {
  id: string;
  scenarioId: string;
  scenarioName: string;
  targetUrl: string;
  executionStatus: "COMPLETED" | "FAILED";
  decisionStatus: DemoDecisionStatus;
  metrics: DemoMetric;
  baseline: {
    id: string;
    p95LatencyMs: number;
    errorRate: number;
    versionNumber: number;
  };
  comparison: {
    p95ChangePercent: number;
    errorRateChangePercent: number;
    regressionDetected: boolean;
    regressionReason: string;
  };
  budgetEvaluation: {
    p95: DemoBudgetResult;
    errorRate: DemoBudgetResult;
    finalResult: DemoBudgetResult;
  };
  createdAt: string;
};

