import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  REDIS_KEY_PREFIX: z.string().min(1).default("regressor99"),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  NVIDIA_API_KEY: z.string().min(1).optional(),
  NVIDIA_BASE_URL: z
    .string()
    .url()
    .default("https://integrate.api.nvidia.com/v1/chat/completions"),
  NVIDIA_AI_MODELS: z
    .string()
    .default(
      [
        "nvidia/nemotron-3-super-120b-a12b",
        "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        "qwen/qwen3-coder-480b-a35b-instruct",
        "deepseek-ai/deepseek-v4-pro",
        "moonshotai/kimi-k2-instruct",
        "openai/gpt-oss-120b"
      ].join(",")
    )
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid API environment variables", parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnv.data;
