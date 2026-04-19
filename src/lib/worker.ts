import { prisma } from "./prisma";
import { distributeToPlatforms } from "./upload-utils";
import path from "path";
import fs from "fs";

/**
 * A simple polling worker that checks for scheduled posts and publishes them.
 */
export async function startPublishingWorker() {
  if ((global as any)._ss_worker_started) return;
  (global as any)._ss_worker_started = true;

  console.log("👷 [WORKER] Scheduled Publishing Worker Started...");

  setInterval(async () => {
    try {
      const now = new Date();
      // console.log(`👷 [WORKER] Polling at ${now.toISOString()}...`);
      
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
      }

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
             console.warn(`⚠️ [WORKER] Post "${post.title}" has no stagedFileId. Marking as processed but failed.`);
             await prisma.postHistory.update({
               where: { id: post.id },
               data: { isPublished: true }
             });
             continue;
          }

          const filePath = path.join(process.cwd(), "src/tmp", stagedFileId);
          if (!fs.existsSync(filePath)) {
            throw new Error(`File purged or missing: ${filePath}`);
          }

          // Mocking a file object for the distribution logic (which expects a File for size check)
          // In a real server environment, we should refactor distributeToPlatforms to accept fileSize instead of File
          const fileStats = fs.statSync(filePath);
          const fakeFile = { size: fileStats.size } as any;

          const formData = new FormData();
          formData.set('title', post.title);
          formData.set('description', post.description || "");
          formData.set('file', fakeFile);

          const selectedAccountIds = post.platforms.map(p => {
             if (p.platform === 'facebook' || p.platform === 'instagram') {
               return `${p.platform}:${p.accountId}`;
             }
             return p.accountId;
          }).filter(Boolean) as string[];

          await distributeToPlatforms({
            stagedFileId,
            fileName: stagedFileId,
            formData,
            accounts: post.user.accounts as any,
            selectedAccountIds,
            contentMode: 'Manual',
            videoFormat: post.videoFormat as any,
            onStatusUpdate: (s) => console.log(`👷 [WORKER-LOG] ${s}`),
            historyId: post.id
          });

          // Mark as published
          await prisma.postHistory.update({
            where: { id: post.id },
            data: { isPublished: true }
          });

          console.log(`✅ [WORKER] Published successfully: ${post.title}`);
        } catch (err: any) {
          console.error(`❌ [WORKER] Failed to publish ${post.title}:`, err.message);
          // We could implement retry delay here, but for now we just leave it for the user to see in history
          // Or we mark it as failed so it doesn't keep looping
          await prisma.postHistory.update({
            where: { id: post.id },
            data: { isPublished: true } // Mark as "processed" even if failed so we don't spam
          });
        }
      }
    } catch (err) {
      console.error("👷 [WORKER] Polling failed:", err);
    }
  }, 10000); // Check every 10 seconds
}
