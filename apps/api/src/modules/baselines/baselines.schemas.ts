import { z } from "zod";

export const suiteBaselineParamsSchema = z.object({
  suiteId: z.string().min(1)
});

export const activeBaselineQuerySchema = z.object({
  environment: z.string().trim().min(1).max(100)
});

export const promoteBaselineParamsSchema = z.object({
  runId: z.string().min(1)
});

export const promoteBaselineSchema = z.object({
  reason: z.string().trim().min(3).max(1000)
});

