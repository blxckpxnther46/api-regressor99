import { describe, expect, it } from "vitest";
import { normalizeMetrics } from "./internal-http-adapter.js";

describe("internal HTTP adapter metrics", () => {
  it("normalizes suite and endpoint metrics", () => {
    const metrics = normalizeMetrics(
      [
        { endpointId: "ep_1", latencyMs: 10, success: true },
        { endpointId: "ep_1", latencyMs: 20, success: false },
        { endpointId: "ep_2", latencyMs: 30, success: true }
      ],
      1000
    );

    expect(metrics[0]).toMatchObject({
      requestCount: 3,
      successCount: 2,
      errorCount: 1,
      p50LatencyMs: 20,
      p95LatencyMs: 30,
      errorRate: 1 / 3
    });
    expect(metrics).toHaveLength(3);
  });
});

