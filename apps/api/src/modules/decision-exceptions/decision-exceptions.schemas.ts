import { z } from "zod";

export const decisionExceptionRunParamsSchema = z.object({
  runId: z.string().min(1)
});

export const approveDecisionExceptionSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
  expiresAt: z.coerce.date().refine((value) => value > new Date(), {
    message: "expiresAt must be in the future."
  })
});

