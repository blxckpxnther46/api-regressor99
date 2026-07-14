import { RegressionStatus } from "@prisma/client";
import { z } from "zod";

export const projectRegressionsParamsSchema = z.object({
  projectId: z.string().min(1)
});

export const listRegressionsQuerySchema = z.object({
  status: z.nativeEnum(RegressionStatus).optional()
});

export const detectRegressionsParamsSchema = z.object({
  runId: z.string().min(1)
});

