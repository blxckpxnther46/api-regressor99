import { BudgetMetric, RegressionSeverity, RegressionType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  classifySeverity,
  detectRegressionCandidates
} from "./regressions.service.js";

describe("regression detection", () => {
  it("does not flag close runs", () => {
    expect(
      detectRegressionCandidates(
        [{ endpointId: null, p95LatencyMs: 100, errorRate: 0, throughputRps: 100 }],
        [{ endpointId: null, p95LatencyMs: 110, errorRate: 0, throughputRps: 90 }]
      )
    ).toEqual([]);
  });

  it("detects latency, error-rate, and throughput regressions", () => {
    const regressions = detectRegressionCandidates(
      [{ endpointId: "ep_1", p95LatencyMs: 100, errorRate: 0, throughputRps: 100 }],
      [{ endpointId: "ep_1", p95LatencyMs: 130, errorRate: 0.01, throughputRps: 70 }]
    );

    expect(regressions).toMatchObject([
      {
        endpointId: "ep_1",
        type: RegressionType.LATENCY,
        metric: BudgetMetric.P95_LATENCY,
        baselineValue: 100,
        currentValue: 130,
        changePercent: 30
      },
      {
        endpointId: "ep_1",
        type: RegressionType.ERROR_RATE,
        metric: BudgetMetric.ERROR_RATE,
        baselineValue: 0,
        currentValue: 0.01,
        changePercent: 100
      },
      {
        endpointId: "ep_1",
        type: RegressionType.THROUGHPUT,
        metric: BudgetMetric.THROUGHPUT,
        baselineValue: 100,
        currentValue: 70,
        changePercent: 30
      }
    ]);
  });

  it("classifies severity from percentage change", () => {
    expect(classifySeverity(20)).toBe(RegressionSeverity.LOW);
    expect(classifySeverity(30)).toBe(RegressionSeverity.MEDIUM);
    expect(classifySeverity(50)).toBe(RegressionSeverity.HIGH);
    expect(classifySeverity(100)).toBe(RegressionSeverity.CRITICAL);
  });
});

