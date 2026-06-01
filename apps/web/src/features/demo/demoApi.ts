import { apiGet, apiPost } from "../../lib/apiClient";
import type { DemoDashboard, DemoRun } from "./demoTypes";

export function getDemoDashboard() {
  return apiGet<DemoDashboard>("/demo/dashboard");
}

export function triggerDemoRun(scenarioId: string) {
  return apiPost<DemoRun>("/demo/runs", { scenarioId });
}

export function promoteDemoBaseline(runId: string) {
  return apiPost<DemoDashboard["baseline"]>("/demo/baselines/promote", {
    runId,
    reason: "Accepted during demo defense walkthrough"
  });
}

export function resetDemo() {
  return apiPost<DemoDashboard>("/demo/reset");
}

