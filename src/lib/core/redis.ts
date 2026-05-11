import { Redis } from "@upstash/redis";

/**
 * Global Redis client for Upstash.
 * Used for rate limiting and potentially other distributed state.
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
