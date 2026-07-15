import { OrganizationRole, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { runInTransaction } from "../../db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ActivityAction } from "../activity-logs/activity-logs.service.js";
import { requireMembership } from "../organizations/organizations.service.js";

const decisionExceptionSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  runId: true,
  approvedByUserId: true,
  reason: true,
  expiresAt: true,
  createdAt: true
} satisfies Prisma.DecisionExceptionSelect;

export async function approveDecisionException(
  userId: string,
  runId: string,
  input: { reason: string; expiresAt: Date }
) {
  const run = await prisma.benchmarkRun.findUnique({
    where: { id: runId },
    select: { id: true, organizationId: true, projectId: true, decisionStatus: true }
  });

  if (!run) {
    throw new AppError(404, "BENCHMARK_RUN_NOT_FOUND", "Benchmark run not found.");
  }

  const membership = await requireMembership(userId, run.organizationId);

  if (!canApproveDecisionException(membership.role)) {
    throw new AppError(
      403,
      "DECISION_EXCEPTION_FORBIDDEN",
      "Owner or admin role required to approve decision exceptions."
    );
  }

  return runInTransaction(async (tx) => {
    const exception = await tx.decisionException.create({
      data: {
        organizationId: run.organizationId,
        projectId: run.projectId,
        runId: run.id,
        approvedByUserId: userId,
        reason: input.reason,
        expiresAt: input.expiresAt
      },
      select: decisionExceptionSelect
    });

    await tx.activityLog.create({
      data: {
        organizationId: run.organizationId,
        actorUserId: userId,
        action: ActivityAction.ExceptionApproved,
        entityType: "decision_exception",
        entityId: exception.id,
        metadata: {
          runId: run.id,
          projectId: run.projectId,
          expiresAt: input.expiresAt.toISOString()
        }
      }
    });

    return exception;
  });
}

export function canApproveDecisionException(role: OrganizationRole) {
  return role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN;
}

