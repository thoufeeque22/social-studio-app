import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

/**
 * Global rate limiter: 10 requests per 10 seconds.
 * Base protection against basic automated abuse.
 */
export const globalRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "ratelimit:global",
});

/**
 * AI Generation rate limiter: 5 requests per 60 seconds.
 * Protects high-cost AI endpoints.
 */
export const aiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "ratelimit:ai",
});

/**
 * Thumbnail Generation rate limiter: 10 requests per day.
 * Protects Vision API costs.
 */
export const thumbnailRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 d"),
  analytics: true,
  prefix: "ratelimit:thumbnail",
});

/**
 * Upload rate limiter: 3 requests per 60 seconds.
 * Prevents storage abuse and bandwidth saturation.
 */
export const uploadRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "60 s"),
  analytics: true,
  prefix: "ratelimit:upload",
});

/**
 * Utility to check rate limit and throw if exceeded.
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string,
  errorMessage: string = "Too many requests. Please try again later."
) {
  // Skip rate limiting if environment variables are not set (e.g. local dev without Upstash)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return;
  }

  const { success } = await limiter.limit(identifier);
  if (!success) {
    throw new Error(errorMessage);
  }
}
