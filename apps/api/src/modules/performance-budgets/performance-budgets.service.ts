import { BudgetOperator, BudgetResult, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMembership } from "../organizations/organizations.service.js";
import { getProject } from "../projects/projects.service.js";

const performanceBudgetSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  suiteId: true,
  endpointId: true,
  name: true,
  metric: true,
  operator: true,
  warnThreshold: true,
  failThreshold: true,
  unit: true,
  isHard: true,
  isEnabled: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.PerformanceBudgetSelect;

type CreatePerformanceBudgetInput = {
  suiteId?: string;
  endpointId?: string;
  name: string;
  metric: Prisma.PerformanceBudgetCreateInput["metric"];
  operator: BudgetOperator;
  warnThreshold?: number;
  failThreshold: number;
  unit: string;
  isHard: boolean;
};

type UpdatePerformanceBudgetInput = Partial<
  Pick<
    CreatePerformanceBudgetInput,
    "name" | "metric" | "operator" | "warnThreshold" | "failThreshold" | "unit" | "isHard"
  >
>;

export async function createPerformanceBudget(
  userId: string,
  projectId: string,
  input: CreatePerformanceBudgetInput
) {
  const project = await getWritableProject(userId, projectId);
  await assertBudgetScope(project.id, input.suiteId, input.endpointId);

  return prisma.performanceBudget.create({
    data: {
      organizationId: project.organizationId,
      projectId: project.id,
      suiteId: input.suiteId,
      endpointId: input.endpointId,
      name: input.name,
      metric: input.metric,
      operator: input.operator,
      warnThreshold: input.warnThreshold,
      failThreshold: input.failThreshold,
      unit: input.unit,
      isHard: input.isHard
    },
    select: performanceBudgetSelect
  });
}

export async function listPerformanceBudgets(
  userId: string,
  projectId: string,
  input: { includeDisabled?: boolean }
) {
  const project = await getProject(userId, projectId);

  return prisma.performanceBudget.findMany({
    where: {
      projectId: project.id,
      isEnabled: input.includeDisabled ? undefined : true
    },
    select: performanceBudgetSelect,
    orderBy: { createdAt: "desc" }
  });
}

export async function getPerformanceBudget(userId: string, budgetId: string) {
  const budget = await prisma.performanceBudget.findUnique({
    where: { id: budgetId },
    select: performanceBudgetSelect
  });

  if (!budget) {
    throw new AppError(404, "PERFORMANCE_BUDGET_NOT_FOUND", "Performance budget not found.");
  }

  await requireMembership(userId, budget.organizationId);

  return budget;
}

export async function updatePerformanceBudget(
  userId: string,
  budgetId: string,
  input: UpdatePerformanceBudgetInput
) {
  await getWritableBudget(userId, budgetId);

  return prisma.performanceBudget.update({
    where: { id: budgetId },
    data: input,
    select: performanceBudgetSelect
  });
}

export async function disablePerformanceBudget(userId: string, budgetId: string) {
  await getWritableBudget(userId, budgetId);

  return prisma.performanceBudget.update({
    where: { id: budgetId },
    data: { isEnabled: false },
    select: performanceBudgetSelect
  });
}

export function evaluateBudget(input: {
  actualValue: number;
  operator: BudgetOperator;
  warnThreshold?: number | null;
  failThreshold: number;
}) {
  if (!passes(input.actualValue, input.operator, input.failThreshold)) {
    return BudgetResult.FAIL;
  }

  if (
    input.warnThreshold !== undefined &&
    input.warnThreshold !== null &&
    !passes(input.actualValue, input.operator, input.warnThreshold)
  ) {
    return BudgetResult.WARN;
  }

  return BudgetResult.PASS;
}

async function getWritableProject(userId: string, projectId: string) {
  const project = await getProject(userId, projectId);
  const membership = await requireMembership(userId, project.organizationId);

  if (!["OWNER", "ADMIN", "DEVELOPER"].includes(membership.role)) {
    throw new AppError(
      403,
      "PERFORMANCE_BUDGET_FORBIDDEN",
      "You cannot modify performance budgets for this project."
    );
  }

  return project;
}

async function getWritableBudget(userId: string, budgetId: string) {
  const budget = await getPerformanceBudget(userId, budgetId);
  const membership = await requireMembership(userId, budget.organizationId);

  if (!["OWNER", "ADMIN", "DEVELOPER"].includes(membership.role)) {
    throw new AppError(
      403,
      "PERFORMANCE_BUDGET_FORBIDDEN",
      "You cannot modify performance budgets for this project."
    );
  }

  return budget;
}

async function assertBudgetScope(
  projectId: string,
  suiteId?: string,
  endpointId?: string
) {
  if (suiteId) {
    const suite = await prisma.benchmarkSuite.findFirst({
      where: { id: suiteId, projectId, isActive: true },
      select: { id: true }
    });

    if (!suite) {
      throw new AppError(400, "BUDGET_SCOPE_INVALID", "Benchmark suite does not belong to this project.");
    }
  }

  if (endpointId) {
    const endpoint = await prisma.benchmarkEndpoint.findFirst({
      where: {
        id: endpointId,
        suiteVersion: {
          suite: { projectId, ...(suiteId ? { id: suiteId } : {}) }
        }
      },
      select: { id: true }
    });

    if (!endpoint) {
      throw new AppError(400, "BUDGET_SCOPE_INVALID", "Benchmark endpoint does not belong to this project.");
    }
  }
}

function passes(actualValue: number, operator: BudgetOperator, threshold: number) {
  switch (operator) {
    case BudgetOperator.LESS_THAN:
      return actualValue < threshold;
    case BudgetOperator.LESS_THAN_OR_EQUAL:
      return actualValue <= threshold;
    case BudgetOperator.GREATER_THAN:
      return actualValue > threshold;
    case BudgetOperator.GREATER_THAN_OR_EQUAL:
      return actualValue >= threshold;
  }
}

