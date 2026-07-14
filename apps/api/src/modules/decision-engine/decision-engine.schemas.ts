import { z } from "zod";

export const decideRunParamsSchema = z.object({
  runId: z.string().min(1)
});

