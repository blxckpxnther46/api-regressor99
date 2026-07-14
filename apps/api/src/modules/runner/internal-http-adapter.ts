import { performance } from "node:perf_hooks";
import { HttpMethod } from "@prisma/client";

export type RunnerEndpoint = {
  id: string;
  method: HttpMethod;
  path: string;
  headers: unknown;
  queryParams: unknown;
  body: unknown;
  expectedStatus: number;
  timeoutMs: number;
};

export type RunnerLoadProfile = {
  requestCount?: number;
  warmupRequests?: number;
  concurrency?: number;
};

export type RunnerSample = {
  endpointId: string;
  latencyMs: number;
  success: boolean;
};

export type NormalizedMetric = {
  endpointId?: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  throughputRps: number;
  errorRate: number;
};

export async function executeInternalHttpRun(input: {
  targetBaseUrl: string;
  loadProfile: unknown;
  endpoints: RunnerEndpoint[];
}) {
  const profile = parseLoadProfile(input.loadProfile);

  for (let index = 0; index < profile.warmupRequests; index += 1) {
    for (const endpoint of input.endpoints) {
      await sendRequest(input.targetBaseUrl, endpoint);
    }
  }

  const startedAt = performance.now();
  const samples = await runMeasuredRequests({
    targetBaseUrl: input.targetBaseUrl,
    endpoints: input.endpoints,
    requestCount: profile.requestCount,
    concurrency: profile.concurrency
  });
  const durationMs = Math.max(performance.now() - startedAt, 1);

  return normalizeMetrics(samples, durationMs);
}

export function normalizeMetrics(samples: RunnerSample[], durationMs: number) {
  const endpointIds = [...new Set(samples.map((sample) => sample.endpointId))];

  return [
    summarizeSamples(samples, durationMs),
    ...endpointIds.map((endpointId) =>
      summarizeSamples(
        samples.filter((sample) => sample.endpointId === endpointId),
        durationMs,
        endpointId
      )
    )
  ];
}

export function summarizeSamples(
  samples: RunnerSample[],
  durationMs: number,
  endpointId?: string
): NormalizedMetric {
  const latencies = samples.map((sample) => sample.latencyMs).sort((a, b) => a - b);
  const requestCount = samples.length;
  const successCount = samples.filter((sample) => sample.success).length;
  const errorCount = requestCount - successCount;

  return {
    endpointId,
    requestCount,
    successCount,
    errorCount,
    averageLatencyMs: requestCount ? sum(latencies) / requestCount : 0,
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
    p99LatencyMs: percentile(latencies, 99),
    minLatencyMs: latencies[0] ?? 0,
    maxLatencyMs: latencies.at(-1) ?? 0,
    throughputRps: requestCount / Math.max(durationMs / 1000, 0.001),
    errorRate: requestCount ? errorCount / requestCount : 0
  };
}

function parseLoadProfile(loadProfile: unknown): Required<RunnerLoadProfile> {
  const value =
    loadProfile && typeof loadProfile === "object"
      ? (loadProfile as RunnerLoadProfile)
      : {};

  return {
    requestCount: clampInt(value.requestCount, 1, 10_000, 1),
    warmupRequests: clampInt(value.warmupRequests, 0, 1000, 0),
    concurrency: clampInt(value.concurrency, 1, 100, 1)
  };
}

async function runMeasuredRequests(input: {
  targetBaseUrl: string;
  endpoints: RunnerEndpoint[];
  requestCount: number;
  concurrency: number;
}) {
  const samples: RunnerSample[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < input.requestCount) {
      const index = nextIndex;
      nextIndex += 1;
      const endpoint = input.endpoints[index % input.endpoints.length]!;
      samples.push(await sendRequest(input.targetBaseUrl, endpoint));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(input.concurrency, input.requestCount) }, () =>
      worker()
    )
  );

  return samples;
}

async function sendRequest(targetBaseUrl: string, endpoint: RunnerEndpoint) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), endpoint.timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(buildRequestUrl(targetBaseUrl, endpoint), {
      method: endpoint.method,
      headers: asHeaders(endpoint.headers),
      body: requestBody(endpoint),
      signal: controller.signal
    });

    return {
      endpointId: endpoint.id,
      latencyMs: performance.now() - startedAt,
      success: response.status === endpoint.expectedStatus
    };
  } catch {
    return {
      endpointId: endpoint.id,
      latencyMs: performance.now() - startedAt,
      success: false
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildRequestUrl(targetBaseUrl: string, endpoint: RunnerEndpoint) {
  const url = new URL(endpoint.path, targetBaseUrl);
  const queryParams = endpoint.queryParams;

  if (queryParams && typeof queryParams === "object" && !Array.isArray(queryParams)) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url;
}

function asHeaders(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, String(entry)])
  );
}

function requestBody(endpoint: RunnerEndpoint) {
  if (
    endpoint.method === HttpMethod.GET ||
    endpoint.method === HttpMethod.HEAD ||
    endpoint.body === null
  ) {
    return undefined;
  }

  return typeof endpoint.body === "string" ? endpoint.body : JSON.stringify(endpoint.body);
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) {
    return 0;
  }

  const index = Math.ceil((percentileValue / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))]!;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function clampInt(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
) {
  if (!Number.isInteger(value)) {
    return fallback;
  }

  return Math.min(Math.max(value!, min), max);
}
