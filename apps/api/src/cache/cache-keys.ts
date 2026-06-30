import { env } from "../config/env.js";

function prefix(parts: string[]) {
  return [env.REDIS_KEY_PREFIX, env.NODE_ENV, ...parts].join(":");
}

export const cacheKeys = {
  projectDashboardSummary(organizationId: string, projectId: string) {
    return prefix(["org", organizationId, "project", projectId, "dashboard-summary"]);
  },
  recentBenchmarkRuns(organizationId: string, projectId: string) {
    return prefix(["org", organizationId, "project", projectId, "recent-benchmark-runs"]);
  },
  regressionList(organizationId: string, projectId: string) {
    return prefix(["org", organizationId, "project", projectId, "regressions"]);
  },
  budgetSummary(organizationId: string, projectId: string) {
    return prefix(["org", organizationId, "project", projectId, "budget-summary"]);
  }
};

export function projectCacheKeys(organizationId: string, projectId: string) {
  return [
    cacheKeys.projectDashboardSummary(organizationId, projectId),
    cacheKeys.recentBenchmarkRuns(organizationId, projectId),
    cacheKeys.regressionList(organizationId, projectId),
    cacheKeys.budgetSummary(organizationId, projectId)
  ];
}
