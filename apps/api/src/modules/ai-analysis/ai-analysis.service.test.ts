import { describe, expect, it } from "vitest";
import {
  dedupeRegressionFacts,
  getOrderedModels,
  parseAiOutput
} from "./ai-analysis.service.js";

describe("ai analysis helpers", () => {
  it("rotates configured models between requests", () => {
    const first = getOrderedModels(["model-a", "model-b", "model-c"]);
    const second = getOrderedModels(["model-a", "model-b", "model-c"]);

    expect(first).toEqual(["model-a", "model-b", "model-c"]);
    expect(second).toEqual(["model-b", "model-c", "model-a"]);
  });

  it("parses strict JSON model output", () => {
    expect(
      parseAiOutput(
        JSON.stringify({
          summary: "Latency increased.",
          whatHappened: ["p95 crossed budget"],
          likelyCauses: ["database query regression"],
          recommendedFixes: ["profile slow query"],
          whatToKeep: ["keep baseline stable"],
          riskLevel: "high",
          nextSteps: ["check deployment diff"]
        })
      )
    ).toMatchObject({
      summary: "Latency increased.",
      riskLevel: "high",
      whatHappened: ["p95 crossed budget"]
    });
  });

  it("wraps non-json output instead of failing", () => {
    expect(parseAiOutput("plain text analysis")).toMatchObject({
      summary: "plain text analysis",
      riskLevel: "unknown",
      whatHappened: []
    });
  });

  it("deduplicates equivalent regression facts before prompting", () => {
    expect(
      dedupeRegressionFacts([
        {
          type: "LATENCY",
          metric: "P95_LATENCY",
          endpointId: null,
          baselineValue: 31.6,
          currentValue: 268,
          changePercent: 746,
          severity: "CRITICAL",
          status: "OPEN"
        },
        {
          type: "LATENCY",
          metric: "P95_LATENCY",
          endpointId: "endpoint_1",
          baselineValue: 31.6,
          currentValue: 268,
          changePercent: 746,
          severity: "CRITICAL",
          status: "OPEN"
        }
      ])
    ).toHaveLength(1);
  });
});
