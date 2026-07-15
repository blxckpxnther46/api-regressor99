import { z } from "zod";
import { apiKeyScopes } from "./api-keys.service.js";

export const organizationApiKeysParamsSchema = z.object({
  organizationId: z.string().min(1)
});

export const apiKeyParamsSchema = z.object({
  apiKeyId: z.string().min(1)
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2).max(100),
  projectId: z.string().min(1).optional(),
  scopes: z.array(z.enum(apiKeyScopes)).min(1)
});

