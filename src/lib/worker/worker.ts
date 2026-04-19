import { prisma } from "@/lib/core/prisma";
import path from "path";
import fs from "fs";

/**
 * A simple polling worker that checks for scheduled posts and publishes them.
 * Includes a version-tracking system to clear old intervals during HMR (Hot Module Replacement).
 */
export async function startPublishingWorker() {
  const currentVersion = Date.now();
  
  if ((global as any)._ss_worker_started) {
    console.log("♻️ [WORKER] Restarting worker with new logic...");
    if ((global as any)._ss_worker_interval) {
        clearInterval((global as any)._ss_worker_interval);
    }
  }
  
  (global as any)._ss_worker_started = true;
  (global as any)._ss_worker_version = currentVersion;

  console.log("👷 [WORKER] Scheduled Publishing Worker Started...");

  const interval = setInterval(async () => {
    // Safety check: if a newer version started, stop this one
    if ((global as any)._ss_worker_version !== currentVersion) {
        clearInterval(interval);
        return;
    }

    try {
      const now = new Date();
      
      const pending = await prisma.postHistory.findMany({
        where: {
          isPublished: false,
          scheduledAt: {
            lte: now
          }
        },
        include: {
          platforms: true,
          user: {
            include: {
              accounts: true
            }
          }
        }
      });

      if (pending.length > 0) {
        console.log(`👷 [WORKER] Found ${pending.length} overdue posts to publish.`);

        for (const post of pending) {
          console.log(`🚀 [WORKER] Attempting to publish: "${post.title}" (ID: ${post.id})`);
          
          // Mark as published immediately so other worker ticks don't pick it up
          await prisma.postHistory.update({
            where: { id: post.id },
            data: { isPublished: true }
          });

          try {
            const stagedFileId = post.stagedFileId;
            if (!stagedFileId) {
               console.warn(`⚠️ [WORKER] Post "${post.title}" has no stagedFileId. Skipping.`);
               continue;
            }

            const filePath = path.join(process.cwd(), "src/tmp", stagedFileId);
            if (!fs.existsSync(filePath)) {
              throw new Error(`File purged or missing: ${filePath}`);
            }

            // Direct server call bypassed HTTP APIs and Auth sessions
            const { distributeToPlatformsServer } = await import('./server-distributor');

            await distributeToPlatformsServer({
              stagedFileId,
              userId: post.userId,
              historyId: post.id,
              title: post.title,
              description: post.description || "",
              videoFormat: post.videoFormat as any,
              platforms: post.platforms.map(p => ({
                platform: p.platform,
                accountId: p.accountId!,
                accountName: p.accountName
              }))
            });

            console.log(`✅ [WORKER] Published successfully: ${post.title}`);
          } catch (err: any) {
            console.error(`❌ [WORKER] Failed to publish ${post.title}:`, err.message);
            // We mark it as published/processed so it doesn't keep looping
            await prisma.postHistory.update({
              where: { id: post.id },
              data: { isPublished: true } 
            });
          }
        }
      }
    } catch (err) {
      console.error("👷 [WORKER] Polling failed:", err);
    }
  }, 10000); // Check every 10 seconds

  (global as any)._ss_worker_interval = interval;
}
