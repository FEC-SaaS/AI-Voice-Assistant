import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Cache helpers
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get<T>(key);
    return cached;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

export async function setInCache<T>(
  key: string,
  value: T,
  expirationSeconds: number = 300
): Promise<void> {
  try {
    await redis.setex(key, expirationSeconds, value);
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

export async function deleteFromCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error("Redis delete error:", error);
  }
}

// Rate limiting helper
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number }> {
  const key = `rate_limit:${identifier}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  return {
    success: current <= limit,
    remaining: Math.max(0, limit - current),
  };
}
