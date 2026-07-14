import { z } from "zod";

export const projectIdParamsSchema = z.object({
  projectId: z.string().min(1)
});

export const listProjectsQuerySchema = z.object({
  organizationId: z.string().min(1),
  includeArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
});

export const createProjectSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(2),
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().optional(),
  defaultBaseUrl: z.string().url().optional()
});

export const updateProjectSchema = createProjectSchema
  .omit({ organizationId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required."
  });

