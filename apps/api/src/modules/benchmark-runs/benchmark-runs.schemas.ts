import { z } from "zod";

export const suiteBenchmarkRunsParamsSchema = z.object({
  suiteId: z.string().min(1)
});

export const benchmarkRunIdParamsSchema = z.object({
  runId: z.string().min(1)
});

export const createBenchmarkRunSchema = z.object({
  deploymentId: z.string().min(1).optional(),
  environment: z.string().trim().min(1).max(100),
  metadata: z.record(z.unknown()).optional()
});

