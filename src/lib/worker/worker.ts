import { prisma } from "@/lib/core/prisma";
import * as Sentry from "@sentry/nextjs";
import path from "path";
import { readFileSync, existsSync, promises as fs } from "fs";
import { logger } from "@/lib/core/logger";

declare global {
  // eslint-disable-next-line no-var
  var _ss_worker_started: boolean | undefined;
  // eslint-disable-next-line no-var
  var _ss_worker_interval: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var _ss_cleanup_interval: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var _ss_worker_version: number | undefined;
}

/**
 * PURGE EXPIRED ASSETS & CLEANUP ORPHANED FILES
 * 1. Cleans up DB records and physical files for expired gallery assets.
 * 2. Purges orphaned files in src/tmp not tracked in DB (>24h old).
 */
export async function purgeExpiredAssets() {
  try {
    const now = new Date();
    
    // --- 1. DB-TRACKED EXPIRED ASSETS ---
    const expired = await prisma.galleryAsset.findMany({
      where: {
        expiresAt: {
          lte: now
        }
      }
    });

    if (expired.length > 0) {
      logger.info(`🧹 [WORKER] Found ${expired.length} expired gallery assets to purge.`);
      
      for (const asset of expired) {
        try {
          const filePath = path.join(process.cwd(), "src/tmp", asset.fileId);
          if (existsSync(filePath)) {
            await fs.unlink(filePath);
            logger.info(`🗑️ [WORKER] Deleted physical file: ${asset.fileId}`);
          }
          
          const metadataPath = path.join(process.cwd(), "src/tmp", `${asset.fileId}.metadata.json`);
          if (existsSync(metadataPath)) {
            await fs.unlink(metadataPath);
          }

          // Also clean up optimized versions if any
          const files = await fs.readdir(path.join(process.cwd(), "src/tmp"));
          for (const file of files) {
             if (file.includes(asset.fileId) && file !== asset.fileId) {
                await fs.unlink(path.join(process.cwd(), "src/tmp", file)).catch(() => {});
             }
          }

          await prisma.galleryAsset.delete({
            where: { id: asset.id }
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(`❌ [WORKER] Failed to purge asset ${asset.fileId}:`, message);
        }
      }
    }

    // --- 2. ORPHANED FILES CLEANUP ---
    // Files in src/tmp older than 24h that are NOT in GalleryAsset or PostHistory
    const tempDir = path.join(process.cwd(), "src/tmp");
    if (existsSync(tempDir)) {
      const files = await fs.readdir(tempDir);
      const dayAgo = now.getTime() - (24 * 60 * 60 * 1000);
      
      const trackedFileIds = new Set([
        ...(await prisma.galleryAsset.findMany({ select: { fileId: true } })).map(a => a.fileId),
        ...(await prisma.postHistory.findMany({ where: { stagedFileId: { not: null } }, select: { stagedFileId: true } })).map(p => p.stagedFileId!)
      ]);

      for (const file of files) {
        if (file === '.gitignore' || file === 'chunks') continue;
        
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile() && stats.mtimeMs < dayAgo) {
           // Check if this file (or its base fileId if it's optimized_) is tracked
           const isTracked = Array.from(trackedFileIds).some(id => file.includes(id));
           
           if (!isTracked) {
              await fs.unlink(filePath);
              logger.info(`🧹 [WORKER] Purged orphaned file: ${file}`);
           }
        }
      }
    }
  } catch (err) {
    logger.error("🧹 [WORKER] Asset purge failed:", err);
  }
}

/**
 * A simple polling worker that checks for scheduled posts and publishes them.
 * Includes a version-tracking system to clear old intervals during HMR (Hot Module Replacement).
 */
export async function startPublishingWorker() {
  const currentVersion = Date.now();
  
  if (global._ss_worker_started) {
    logger.info("♻️ [WORKER] Restarting worker with new logic...");
    if (global._ss_worker_interval) {
        clearInterval(global._ss_worker_interval);
    }
    if (global._ss_cleanup_interval) {
        clearInterval(global._ss_cleanup_interval);
    }
  }
  
  global._ss_worker_started = true;
  global._ss_worker_version = currentVersion;

  logger.info("👷 [WORKER] Scheduled Publishing Worker Started...");

  const interval = setInterval(async () => {
    // Safety check: if a newer version started, stop this one
    if (global._ss_worker_version !== currentVersion) {
        clearInterval(interval);
        return;
    }

    try {
      const now = new Date();
      logger.info(`💓 [WORKER-HEARTBEAT] [PULSE-CHECK-V1] Checking at ${now.toISOString()}...`);
      
      const totalPendingCount = await prisma.postHistory.count({ where: { isPublished: false } });
      if (totalPendingCount > 0) {
        logger.info(`🔍 [WORKER-DEBUG] Found ${totalPendingCount} total non-published posts in DB.`);
      }

      const pending = await prisma.postHistory.findMany({
        where: {
          isPublished: false,
          stagedFileId: { not: null },
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
        logger.info(`👷 [WORKER] Found ${pending.length} overdue posts to publish. Processing in parallel...`);

        await Promise.allSettled(pending.map(async (post) => {
          logger.info(`🚀 [WORKER] Attempting to publish: "${post.title}" (ID: ${post.id})`);
          
          // Mark as published immediately so other worker ticks don't pick it up
          await prisma.postHistory.update({
            where: { id: post.id },
            data: { isPublished: true }
          });

          try {
            const stagedFileId = post.stagedFileId;
            if (!stagedFileId) {
               logger.warn(`⚠️ [WORKER] Post "${post.title}" has no stagedFileId. Skipping.`);
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
               } catch {
                  logger.warn("⚠️ [WORKER] Failed to parse metadata sidecar");
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
              videoFormat: post.videoFormat as 'short' | 'long',
              platforms: post.platforms.map((p) => ({
                platform: p.platform,
                accountId: p.accountId!,
                accountName: p.accountName
              })),
              reviewedContent
            });

            logger.info(`✅ [WORKER] Published successfully: ${post.title}`);

            // Shorten expiry to now + 24h since it's already published
            if (stagedFileId) {
               await prisma.galleryAsset.updateMany({
                  where: { fileId: stagedFileId },
                  data: { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }
               }).catch(() => {});
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`❌ [WORKER] Failed to publish ${post.title}: ${message}`);
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
      logger.error(`👷 [WORKER] Polling failed: ${err}`);
      Sentry.captureException(err);
    }
  }, 10000); // Check every 10 seconds

  // Asset Cleanup Interval (Every 1 hour)
  const cleanupInterval = setInterval(async () => {
    if (global._ss_worker_version !== currentVersion) {
      clearInterval(cleanupInterval);
      return;
    }
    await purgeExpiredAssets();
  }, 60 * 60 * 1000);

  // Run cleanup immediately on start
  purgeExpiredAssets();

  global._ss_worker_interval = interval;
  global._ss_cleanup_interval = cleanupInterval;
}
