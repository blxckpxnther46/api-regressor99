import { z } from "zod";

export const createCiCdBenchmarkRunSchema = z.object({
  projectId: z.string().min(1),
  suiteId: z.string().min(1),
  environment: z.string().trim().min(1).max(100),
  deployment: z
    .object({
      commitSha: z.string().trim().min(1).max(100).optional(),
      branch: z.string().trim().min(1).max(200).optional(),
      version: z.string().trim().min(1).max(100).optional(),
      deployReference: z.string().trim().min(1).max(200).optional(),
      deployedAt: z.coerce.date().optional(),
      metadata: z.record(z.unknown()).optional()
    })
    .optional(),
  metadata: z.record(z.unknown()).optional()
});

