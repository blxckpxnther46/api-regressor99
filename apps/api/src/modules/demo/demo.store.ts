import type { DemoRun, DemoScenario } from "./demo.types.js";

export const demoProject = {
  id: "project_demo_checkout",
  name: "Checkout API",
  environment: "staging"
};

export const demoSuite = {
  id: "suite_demo_checkout",
  name: "Checkout Critical Path",
  projectId: demoProject.id
};

export const demoBudgets = {
  p95LatencyMs: {
    warnThreshold: 220,
    failThreshold: 300
  },
  errorRate: {
    warnThreshold: 1,
    failThreshold: 5
  }
};

export const demoScenarios: DemoScenario[] = [
  {
    id: "baseline",
    name: "Stable baseline",
    description: "Healthy checkout API behavior close to the accepted baseline.",
    targetPath: "/api/checkout/baseline",
    requestCount: 10
  },
  {
    id: "expanded",
    name: "Expected API expansion",
    description:
      "The endpoint intentionally does more work, so it is slower but still under the hard budget.",
    targetPath: "/api/checkout/expanded",
    requestCount: 10
  },
  {
    id: "slow-regression",
    name: "Unexpected slow regression",
    description:
      "The endpoint became much slower and should fail the p95 latency budget.",
    targetPath: "/api/checkout/slow-regression",
    requestCount: 10
  },
  {
    id: "error-prone",
    name: "Error-rate regression",
    description:
      "The endpoint has intermittent upstream failures and should fail the error-rate budget.",
    targetPath: "/api/checkout/error-prone",
    requestCount: 12
  }
];

export let activeBaseline = {
  id: "baseline_v1",
  p95LatencyMs: 180,
  errorRate: 0,
  versionNumber: 1,
  promotedReason: "Initial accepted staging baseline"
};

export let demoRuns: DemoRun[] = [];

export function resetDemoStore() {
  activeBaseline = {
    id: "baseline_v1",
    p95LatencyMs: 180,
    errorRate: 0,
    versionNumber: 1,
    promotedReason: "Initial accepted staging baseline"
  };
  demoRuns = [];
}

export function promoteRunToBaseline(run: DemoRun, reason: string) {
  activeBaseline = {
    id: `baseline_v${activeBaseline.versionNumber + 1}`,
    p95LatencyMs: run.metrics.p95LatencyMs,
    errorRate: run.metrics.errorRate,
    versionNumber: activeBaseline.versionNumber + 1,
    promotedReason: reason
  };

  return activeBaseline;
}

