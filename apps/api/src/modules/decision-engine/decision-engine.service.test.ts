import { BudgetResult, DecisionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { applyDecisionRules } from "./decision-engine.service.js";

describe("decision engine rules", () => {
  it("passes when budgets pass and no regressions exist", () => {
    expect(
      applyDecisionRules({
        budgetEvaluations: [{ result: BudgetResult.PASS, isHard: true }],
        hasOpenRegression: false,
        hasActiveException: false
      })
    ).toBe(DecisionStatus.PASSED);
  });

  it("requires review when regression exists but budgets pass", () => {
    expect(
      applyDecisionRules({
        budgetEvaluations: [{ result: BudgetResult.PASS, isHard: true }],
        hasOpenRegression: true,
        hasActiveException: false
      })
    ).toBe(DecisionStatus.NEEDS_REVIEW);
  });

  it("fails on hard budget failure", () => {
    expect(
      applyDecisionRules({
        budgetEvaluations: [{ result: BudgetResult.FAIL, isHard: true }],
        hasOpenRegression: false,
        hasActiveException: false
      })
    ).toBe(DecisionStatus.FAILED);
  });

  it("warns on soft budget warning", () => {
    expect(
      applyDecisionRules({
        budgetEvaluations: [{ result: BudgetResult.WARN, isHard: false }],
        hasOpenRegression: false,
        hasActiveException: false
      })
    ).toBe(DecisionStatus.WARNED);
  });
});

