import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { requireMembership } from "../organizations/organizations.service.js";

export const ActivityAction = {
  UserRegistered: "user.registered",
  ProjectCreated: "project.created",
  SuiteCreated: "benchmark_suite.created",
  SuiteVersionCreated: "benchmark_suite.version_created",
  RunTriggered: "benchmark_run.triggered",
  RunCompleted: "benchmark_run.completed",
  BaselinePromoted: "baseline.promoted",
  BudgetChanged: "performance_budget.changed",
  RegressionDetected: "regression.detected",
  ExceptionApproved: "decision_exception.approved",
  ApiKeyCreated: "api_key.created",
  ApiKeyRevoked: "api_key.revoked",
  CiRunTriggered: "ci.benchmark_run.triggered",
  TargetVerificationCreated: "target_verification.created",
  TargetVerificationCompleted: "target_verification.completed",
  TargetVerificationRevoked: "target_verification.revoked"
} as const;

export type ActivityAction = (typeof ActivityAction)[keyof typeof ActivityAction];

const activityLogSelect = {
  id: true,
  organizationId: true,
  actorUserId: true,
  actorApiKeyId: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  createdAt: true
} satisfies Prisma.ActivityLogSelect;

type LogActivityInput = {
  organizationId: string;
  actorUserId?: string;
  actorApiKeyId?: string;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export async function listActivityLogs(
  userId: string,
  organizationId: string,
  input: { entityType?: string; entityId?: string }
) {
  await requireMembership(userId, organizationId);

  return prisma.activityLog.findMany({
    where: {
      organizationId,
      entityType: input.entityType,
      entityId: input.entityId
    },
    select: activityLogSelect,
    orderBy: { createdAt: "desc" },
    take: 100
  });
}

export function logActivity(input: LogActivityInput) {
  return prisma.activityLog.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorApiKeyId: input.actorApiKeyId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata as Prisma.InputJsonObject | undefined
    },
    select: activityLogSelect
  });
}

export function isKnownActivityAction(action: string) {
  return Object.values(ActivityAction).includes(action as ActivityAction);
}

