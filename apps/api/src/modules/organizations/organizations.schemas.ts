import { OrganizationRole } from "@prisma/client";
import { z } from "zod";

export const organizationParamsSchema = z.object({
  organizationId: z.string().min(1)
});

export const memberParamsSchema = organizationParamsSchema.extend({
  memberId: z.string().min(1)
});

export const addMemberSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.nativeEnum(OrganizationRole)
});

export const updateMemberSchema = z.object({
  role: z.nativeEnum(OrganizationRole)
});

