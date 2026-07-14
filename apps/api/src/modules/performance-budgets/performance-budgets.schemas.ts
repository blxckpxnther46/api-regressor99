import { BudgetMetric, BudgetOperator } from "@prisma/client";
import { z } from "zod";

export const projectPerformanceBudgetsParamsSchema = z.object({
  projectId: z.string().min(1)
});

export const performanceBudgetIdParamsSchema = z.object({
  budgetId: z.string().min(1)
});

export const listPerformanceBudgetsQuerySchema = z.object({
  includeDisabled: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
});

export const createPerformanceBudgetSchema = z.object({
  suiteId: z.string().min(1).optional(),
  endpointId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(200),
  metric: z.nativeEnum(BudgetMetric),
  operator: z.nativeEnum(BudgetOperator),
  warnThreshold: z.number().finite().nonnegative().optional(),
  failThreshold: z.number().finite().nonnegative(),
  unit: z.string().trim().min(1).max(50),
  isHard: z.boolean().default(true)
});

export const updatePerformanceBudgetSchema = createPerformanceBudgetSchema
  .omit({ suiteId: true, endpointId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  });

