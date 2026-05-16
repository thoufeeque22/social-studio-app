import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { redis } from "@/lib/core/redis";
import { prisma } from "@/lib/core/prisma";

/**
 * API route to aggregate Redis telemetry counters into Prisma.
 * Strictly protected for ADMIN role.
 * Triggered periodically via a cron job or manual trigger.
 */
export async function POST() {
  const session = await auth();

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const keys = await redis.keys("telemetry:*");
    const results = [];

    for (const key of keys) {
      // key format: telemetry:YYYY-MM-DD:event_name
      const parts = key.split(":");
      if (parts.length < 3) continue;

      const dateStr = parts[1];
      const eventName = parts.slice(2).join(":");

      const value = await redis.get<number>(key);
      if (value === null) continue;

      const timestamp = new Date(dateStr);
      
      // We use the start of the day for the metric timestamp to group by day
      const startOfDay = new Date(timestamp);
      startOfDay.setUTCHours(0, 0, 0, 0);
      
      const endOfDay = new Date(timestamp);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Manual check-and-update/create since schema lacks unique constraint on (name, timestamp)
      const existing = await prisma.systemMetric.findFirst({
        where: {
          name: eventName,
          timestamp: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (existing) {
        await prisma.systemMetric.update({
          where: { id: existing.id },
          data: { value: Number(value) },
        });
      } else {
        await prisma.systemMetric.create({
          data: {
            name: eventName,
            value: Number(value),
            timestamp: startOfDay,
          },
        });
      }

      // If the date is older than today, we can safely delete the Redis key after aggregation
      const todayStr = new Date().toISOString().split("T")[0];
      if (dateStr < todayStr) {
        await redis.del(key);
      }
      
      results.push({ key, value, event: eventName, date: dateStr });
    }

    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      details: results 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[AGGREGATION_ERROR]", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: errorMessage 
    }, { status: 500 });
  }
}
