import { z } from "zod";

export const activityLogsParamsSchema = z.object({
  organizationId: z.string().min(1)
});

export const activityLogsQuerySchema = z.object({
  entityType: z.string().trim().min(1).optional(),
  entityId: z.string().trim().min(1).optional()
});

