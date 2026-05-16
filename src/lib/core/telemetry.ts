import { redis } from "./redis";

/**
 * Standard telemetry event keys.
 * Format: category:action:subject
 */
export const TELEMETRY_EVENTS = {
  // Feature Usage
  FEATURE_AI_CHATBOT: "feature:usage:ai_chatbot",
  FEATURE_CALENDAR: "feature:usage:calendar",
  FEATURE_SNIPPETS: "feature:usage:snippets",
  FEATURE_GLOBAL_SEARCH: "feature:usage:global_search",
  FEATURE_MEDIA_PICKER: "feature:usage:media_picker",
  
  // Platform Operations
  PLATFORM_SUCCESS_YOUTUBE: "platform:success:youtube",
  PLATFORM_SUCCESS_INSTAGRAM: "platform:success:instagram",
  PLATFORM_SUCCESS_TIKTOK: "platform:success:tiktok",
  
  PLATFORM_ERROR_YOUTUBE: "platform:error:youtube",
  PLATFORM_ERROR_INSTAGRAM: "platform:error:instagram",
  PLATFORM_ERROR_TIKTOK: "platform:error:tiktok",
  
  // System Performance
  SYSTEM_TRANSCODE_SUCCESS: "system:transcode:success",
  SYSTEM_TRANSCODE_ERROR: "system:transcode:error",
  
  // API Consumption
  API_GOOGLE_USAGE: "api:consumption:google",
  API_SENTRY_EVENT: "api:consumption:sentry",
} as const;

export type TelemetryEvent = typeof TELEMETRY_EVENTS[keyof typeof TELEMETRY_EVENTS];

/**
 * Fire-and-forget telemetry utility.
 * Increments a high-frequency counter in Redis.
 * Uses a daily key format: telemetry:YYYY-MM-DD:event_name
 * 
 * @param event - The event to track (must be one of TELEMETRY_EVENTS)
 * @param incrementBy - Amount to increment the counter by (default: 1)
 */
export function trackEvent(event: TelemetryEvent, incrementBy: number = 1): void {
  try {
    const today = new Date().toISOString().split("T")[0];
    const key = `telemetry:${today}:${event}`;

    // Fire-and-forget: we do not await the redis call to avoid blocking the main thread.
    // Errors are caught and logged.
    redis.incrby(key, incrementBy).catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[TELEMETRY_ERROR] Failed to track event ${event}: ${errorMessage}`);
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[TELEMETRY_ERROR] Critical failure in trackEvent: ${errorMessage}`);
  }
}
