import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env.js";
import { logger } from "../shared/logger.js";

let redisClient: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;

export function isRedisEnabled() {
  return Boolean(env.REDIS_URL);
}

async function connectRedisClient() {
  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!redisClient) {
    redisClient = createClient({ url: env.REDIS_URL });

    redisClient.on("error", (error) => {
      logger.error({ err: error }, "Redis client error");
    });
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info("Redis connected");
  }

  return redisClient;
}

export async function getRedisClient() {
  if (!isRedisEnabled()) {
    return null;
  }

  if (!connectPromise) {
    connectPromise = connectRedisClient().finally(() => {
      connectPromise = null;
    });
  }

  return connectPromise;
}

export async function readCache<T>(key: string) {
  const client = await getRedisClient();

  if (!client) {
    return null;
  }

  const value = await client.get(key);
  return value ? (JSON.parse(value) as T) : null;
}

export async function writeCache(key: string, value: unknown, ttlSeconds: number) {
  const client = await getRedisClient();

  if (!client) {
    return;
  }

  await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

export async function deleteCache(keys: string[]) {
  const client = await getRedisClient();

  if (!client || keys.length === 0) {
    return;
  }

  await client.del(keys);
}

export async function disconnectRedis() {
  if (!redisClient?.isOpen) {
    return;
  }

  await redisClient.quit();
  redisClient = null;
}
