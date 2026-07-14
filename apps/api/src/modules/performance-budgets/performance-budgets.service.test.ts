import { BudgetOperator, BudgetResult } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { evaluateBudget } from "./performance-budgets.service.js";

describe("performance budget evaluator", () => {
  it("passes, warns, and fails latency budgets", () => {
    const budget = {
      operator: BudgetOperator.LESS_THAN_OR_EQUAL,
      warnThreshold: 100,
      failThreshold: 120
    };

    expect(evaluateBudget({ ...budget, actualValue: 90 })).toBe(BudgetResult.PASS);
    expect(evaluateBudget({ ...budget, actualValue: 110 })).toBe(BudgetResult.WARN);
    expect(evaluateBudget({ ...budget, actualValue: 130 })).toBe(BudgetResult.FAIL);
  });

  it("handles throughput budgets", () => {
    const budget = {
      operator: BudgetOperator.GREATER_THAN_OR_EQUAL,
      warnThreshold: 100,
      failThreshold: 80
    };

    expect(evaluateBudget({ ...budget, actualValue: 120 })).toBe(BudgetResult.PASS);
    expect(evaluateBudget({ ...budget, actualValue: 90 })).toBe(BudgetResult.WARN);
    expect(evaluateBudget({ ...budget, actualValue: 70 })).toBe(BudgetResult.FAIL);
  });
});

