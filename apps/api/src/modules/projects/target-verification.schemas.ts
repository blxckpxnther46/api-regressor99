import { TargetVerificationMethod } from "@prisma/client";
import { z } from "zod";

export const targetVerificationParamsSchema = z.object({
  projectId: z.string().min(1)
});

export const createTargetVerificationSchema = z.object({
  targetBaseUrl: z.string().url(),
  method: z.nativeEnum(TargetVerificationMethod),
  verificationUrl: z.string().url().optional()
});

