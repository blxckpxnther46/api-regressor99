import { z } from "zod";

export const runAiAnalysisParamsSchema = z.object({
  runId: z.string().min(1)
});

