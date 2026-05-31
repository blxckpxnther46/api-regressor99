export type ExecutionStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type DecisionStatus =
  | "PASSED"
  | "WARNED"
  | "FAILED"
  | "NEEDS_REVIEW";

export type OrganizationRole = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";

export type BudgetResult = "PASS" | "WARN" | "FAIL";

export type RegressionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

