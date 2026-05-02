import { prisma } from "@/lib/core/prisma";
import * as Sentry from "@sentry/nextjs";
import path from "path";
import { readFileSync, existsSync, promises as fs } from "fs";

/**
 * PURGE EXPIRED ASSETS
 * Cleans up both DB records and physical files for staged assets older than 7 days.
 */
async function purgeExpiredAssets() {
  try {
    const now = new Date();
    const expired = await prisma.galleryAsset.findMany({
      where: {
        expiresAt: {
          lte: now
        }
      }
    });

    if (expired.length > 0) {
      console.log(`🧹 [WORKER] Found ${expired.length} expired gallery assets to purge.`);
      
      for (const asset of expired) {
        try {
          const filePath = path.join(process.cwd(), "src/tmp", asset.fileId);
          if (existsSync(filePath)) {
            await fs.unlink(filePath);
            console.log(`🗑️ [WORKER] Deleted physical file: ${asset.fileId}`);
          }
          
          const metadataPath = path.join(process.cwd(), "src/tmp", `${asset.fileId}.metadata.json`);
          if (existsSync(metadataPath)) {
            await fs.unlink(metadataPath);
          }

          await prisma.galleryAsset.delete({
            where: { id: asset.id }
          });
        } catch (err: any) {
          console.error(`❌ [WORKER] Failed to purge asset ${asset.fileId}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("🧹 [WORKER] Asset purge failed:", err);
  }
}

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
    if ((global as any)._ss_cleanup_interval) {
        clearInterval((global as any)._ss_cleanup_interval);
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
        console.log(`👷 [WORKER] Found ${pending.length} overdue posts to publish. Processing in parallel...`);

        await Promise.allSettled(pending.map(async (post) => {
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
               return;
            }

            const filePath = path.join(process.cwd(), "src/tmp", stagedFileId);
            if (!existsSync(filePath)) {
              throw new Error(`File purged or missing: ${filePath}`);
            }

            const metadataPath = path.join(process.cwd(), "src/tmp", `${stagedFileId}.metadata.json`);
            let reviewedContent = undefined;
            if (existsSync(metadataPath)) {
               try {
                  reviewedContent = JSON.parse(readFileSync(metadataPath, "utf8"));
               } catch (e) {
                  console.warn("⚠️ [WORKER] Failed to parse metadata sidecar", e);
               }
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
              })),
              reviewedContent
            });

            console.log(`✅ [WORKER] Published successfully: ${post.title}`);
          } catch (err: any) {
            console.error(`❌ [WORKER] Failed to publish ${post.title}:`, err.message);
            Sentry.captureException(err, {
              extra: { postId: post.id, title: post.title }
            });
            // We mark it as processed so it doesn't keep looping
            await prisma.postHistory.update({
              where: { id: post.id },
              data: { isPublished: true } 
            });
          }
        }));
      }
    } catch (err) {
      console.error("👷 [WORKER] Polling failed:", err);
      Sentry.captureException(err);
    }
  }, 10000); // Check every 10 seconds

  // Asset Cleanup Interval (Every 1 hour)
  const cleanupInterval = setInterval(async () => {
    if ((global as any)._ss_worker_version !== currentVersion) {
      clearInterval(cleanupInterval);
      return;
    }
    await purgeExpiredAssets();
  }, 60 * 60 * 1000);

  // Run cleanup immediately on start
  purgeExpiredAssets();

  (global as any)._ss_worker_interval = interval;
  (global as any)._ss_cleanup_interval = cleanupInterval;
}
