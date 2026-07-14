import { HttpMethod } from "@prisma/client";
import { z } from "zod";

const jsonRecordSchema = z.record(z.unknown());

const endpointSchema = z.object({
  name: z.string().trim().min(1).max(200),
  method: z.nativeEnum(HttpMethod),
  path: z.string().trim().min(1).max(500),
  headers: jsonRecordSchema.optional(),
  queryParams: jsonRecordSchema.optional(),
  body: z.unknown().optional(),
  expectedStatus: z.number().int().min(100).max(599).default(200),
  assertions: jsonRecordSchema.optional(),
  timeoutMs: z.number().int().min(100).max(120_000).default(5000)
});

export const projectBenchmarkSuitesParamsSchema = z.object({
  projectId: z.string().min(1)
});

export const benchmarkSuiteIdParamsSchema = z.object({
  suiteId: z.string().min(1)
});

export const createBenchmarkSuiteSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(1000).optional(),
  targetBaseUrl: z.string().url(),
  loadProfile: jsonRecordSchema,
  endpoints: z.array(endpointSchema).min(1).max(100)
});

export const createBenchmarkSuiteVersionSchema = z.object({
  loadProfile: jsonRecordSchema,
  endpoints: z.array(endpointSchema).min(1).max(100)
});

