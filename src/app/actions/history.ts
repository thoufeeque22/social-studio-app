'use server';

import { prisma } from '@/lib/core/prisma';
import { protectedAction, revalidateDashboard } from '@/lib/core/action-utils';
import { 
  extractPlatformPostId, 
  generatePermalink 
} from '@/lib/core/distributor-utils';
import { distributeSinglePlatform } from '@/lib/core/distributor-server';
import path from 'path';
import fs from 'fs';
import { AIWriteResult } from '@/lib/utils/ai-writer';

import { z } from "zod";
import { logger } from '@/lib/core/logger';

const PlatformResultSchema = z.object({
  platform: z.string(),
  accountId: z.string().optional(),
  accountName: z.string().nullable().optional(),
  platformPostId: z.string().nullable().optional(),
  permalink: z.string().nullable().optional(),
  status: z.enum(['success', 'failed', 'retrying', 'pending', 'cancelled']),
  errorMessage: z.string().nullable().optional(),
  resumableUrl: z.string().nullable().optional(),
  videoId: z.string().nullable().optional(),
  creationId: z.string().nullable().optional(),
  metadata: z.any().optional(),
});

export type PlatformResultInput = z.infer<typeof PlatformResultSchema>;

const SavePostHistorySchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  videoFormat: z.enum(['short', 'long']),
  platforms: z.array(PlatformResultSchema),
  stagedFileId: z.string().optional(),
  scheduledAt: z.union([z.date(), z.string(), z.number()]).transform(val => val ? new Date(val) : null).nullable().optional(),
  isPublished: z.boolean().optional(),
});

export type SavePostHistoryInput = z.infer<typeof SavePostHistorySchema>;

/**
 * Upserts a single platform result (Internal version for Worker).
 */
export async function upsertPlatformResultInternal(userId: string, historyId: string, result: PlatformResultInput) {
  const history = await prisma.postHistory.findUnique({
    where: { id: historyId, userId: userId }
  });
  if (!history) throw new Error('History entry not found');

  return await prisma.postPlatformResult.upsert({
    where: {
      postHistoryId_platform_accountId: {
        postHistoryId: historyId,
        platform: result.platform,
        accountId: result.accountId || ''
      }
    },
    update: { ...result, postHistoryId: historyId },
    create: { ...result, postHistoryId: historyId }
  });
}

/**
 * Upserts a single platform result for a post history entry (Authenticated).
 */
export async function upsertPlatformResult(historyId: string, result: PlatformResultInput) {
  return protectedAction(async (userId) => {
    return await upsertPlatformResultInternal(userId, historyId, result);
  });
}

export async function savePostHistory(rawInput: SavePostHistoryInput) {
  return protectedAction(async (userId) => {
    // 1. Runtime Validation
    const validated = SavePostHistorySchema.parse(rawInput);
    const { title, description, videoFormat, platforms, stagedFileId, scheduledAt, isPublished } = validated;

    // 🛠️ DEVELOPMENTAL AUTO-TITLE LOGIC
    let finalTitle = title;
    if (!finalTitle || finalTitle.trim() === "" || /^\d+$/.test(finalTitle)) {
      const lastPost = await prisma.postHistory.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      const lastNum = parseInt(lastPost?.title.match(/\d+/)?.[0] || "0", 10);
      finalTitle = `${lastNum + 1}`;
      logger.info(`🪄 [DEV-AUTO-TITLE] Incrementing title to: ${finalTitle}`);
    }

    const postHistory = await prisma.postHistory.create({
      data: {
        userId,
        title: finalTitle,
        description: description,
        videoFormat: videoFormat,
        stagedFileId: stagedFileId,
        scheduledAt: scheduledAt ?? new Date(),
        isPublished: isPublished ?? false,
        platforms: {
          create: platforms.map((p) => ({
            platform: p.platform,
            accountId: p.accountId,
            accountName: p.accountName || null,
            platformPostId: p.platformPostId || null,
            permalink: p.permalink || null,
            status: p.status,
            errorMessage: p.errorMessage || null,
            resumableUrl: p.resumableUrl || null,
            videoId: p.videoId || null,
            creationId: p.creationId || null,
            metadata: p.metadata || null,
          })),
        },
      },
      include: {
        platforms: true,
      },
    });

    await revalidateDashboard();
    return { success: true, data: postHistory };
  });
}

/**
 * Retries a failed upload attempt for a specific platform.
 */
export async function retryUploadAction(resultId: string) {
  return protectedAction(async (userId) => {
    const result = await prisma.postPlatformResult.findUnique({
      where: { id: resultId },
      include: { postHistory: true }
    });

    if (!result || result.postHistory.userId !== userId) {
      throw new Error('Upload result not found.');
    }

    // 1. Mark as retrying
    await prisma.postPlatformResult.update({
       where: { id: resultId },
       data: { 
         status: 'retrying',
         errorMessage: null,
         retryCount: { increment: 1 },
         lastRetryAt: new Date()
       }
    });

    try {
      const stagedFileId = result.postHistory.stagedFileId;
      if (!stagedFileId) throw new Error("Original staged file reference missing.");

      const filePath = path.join(process.cwd(), "src/tmp", stagedFileId);
      if (!fs.existsSync(filePath)) {
        throw new Error("Source video file has been purged from the server (24h limit).");
      }

      // 2. USE CENTRALIZED LOGIC
      const platformResult = await distributeSinglePlatform({
        platform: result.platform,
        userId,
        filePath,
        title: result.postHistory.title,
        description: result.postHistory.description || "",
        videoFormat: result.postHistory.videoFormat as "short" | "long",
        accountId: result.accountId || undefined,
        fields: {
          resumableUrl: result.resumableUrl,
          videoId: result.videoId,
          creationId: result.creationId
        }
      });

      // 3. Update with success
      const castResult = platformResult as { videoId?: string; id?: string; creationId?: string };
      await prisma.postPlatformResult.update({
        where: { id: resultId },
        data: { 
          status: 'success',
          platformPostId: extractPlatformPostId(result.platform, platformResult),
          permalink: generatePermalink(result.platform, platformResult),
          videoId: castResult.videoId || castResult.id,
          creationId: castResult.creationId,
          errorMessage: null
        }
      });

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown retry error";
      logger.error(`Retry attempt failed for ${result.platform}`, err);
      await prisma.postPlatformResult.update({
        where: { id: resultId },
        data: { 
          status: 'failed', 
          errorMessage: message,
          resumableUrl: (err as { resumableUrl?: string }).resumableUrl || result.resumableUrl,
          videoId: (err as { videoId?: string }).videoId || result.videoId,
          creationId: (err as { creationId?: string }).creationId || result.creationId
        }
      });
      return { success: false, error: message };
    }
  });
}

/**
 * Cancels a platform distribution task.
 */
export async function cancelPlatformUploadAction(resultId: string) {
  return protectedAction(async (userId) => {
    const result = await prisma.postPlatformResult.findUnique({
      where: { id: resultId },
      include: { postHistory: true }
    });

    if (!result || result.postHistory.userId !== userId) {
      throw new Error('Upload result not found.');
    }

    await prisma.postPlatformResult.update({
      where: { id: resultId },
      data: { 
        status: 'cancelled',
        errorMessage: 'Stopped by user'
      }
    });

    return { success: true };
  });
}

/**
 * Cancels all platform distribution tasks for a specific post.
 */
export async function cancelAllUploadsAction(historyId: string) {
  return protectedAction(async (userId) => {
    const history = await prisma.postHistory.findUnique({
      where: { id: historyId, userId },
      include: { platforms: true }
    });

    if (!history) throw new Error('Post history not found.');

    await prisma.postPlatformResult.updateMany({
      where: { 
        postHistoryId: historyId,
        status: { in: ['pending', 'uploading', 'processing', 'retrying'] }
      },
      data: { 
        status: 'cancelled',
        errorMessage: 'Stopped by user'
      }
    });

    return { success: true };
  });
}

/**
 * Fetches upcoming scheduled posts.
 */
export async function getUpcomingPosts() {
  return protectedAction(async (userId) => {
    return await prisma.postHistory.findMany({
      where: {
        userId,
        isPublished: false
      },
      orderBy: {
        scheduledAt: 'asc'
      },
      take: 5
    });
  }).catch(() => []);
}

/**
 * Updates a scheduled post (before it is published).
 */
export async function updateScheduledPost(id: string, data: { title?: string; description?: string; scheduledAt?: string }) {
  return protectedAction(async (userId) => {
    const post = await prisma.postHistory.findUnique({
      where: { id, userId }
    });

    if (!post || post.isPublished) throw new Error('Post not found or already published.');

    const updated = await prisma.postHistory.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined
      }
    });

    // Sync GalleryAsset expiry
    if (updated.stagedFileId && updated.scheduledAt) {
      const newExpiry = new Date(updated.scheduledAt.getTime() + 48 * 60 * 60 * 1000);
      await prisma.galleryAsset.updateMany({
        where: { fileId: updated.stagedFileId },
        data: { expiresAt: newExpiry }
      }).catch((e: unknown) => logger.warn("Failed to sync gallery expiry", e));
    }

    await revalidateDashboard();
    return updated;
  });
}

/**
 * Marks a scheduled post to be published ASAP.
 */
export async function publishNowAction(id: string) {
  return protectedAction(async (userId) => {
    const post = await prisma.postHistory.findUnique({
      where: { id, userId }
    });

    if (!post || post.isPublished) throw new Error('Post not found or already published.');

    const updated = await prisma.postHistory.update({
      where: { id },
      data: { scheduledAt: new Date() }
    });

    // Sync GalleryAsset expiry
    if (updated.stagedFileId && updated.scheduledAt) {
      const newExpiry = new Date(updated.scheduledAt.getTime() + 48 * 60 * 60 * 1000);
      await prisma.galleryAsset.updateMany({
        where: { fileId: updated.stagedFileId },
        data: { expiresAt: newExpiry }
      }).catch((e: unknown) => logger.warn("Failed to sync gallery expiry", e));
    }

    await revalidateDashboard();
    return updated;
  });
}

/**
 * Deletes a scheduled post.
 */
export async function deleteScheduledPost(id: string) {
  return protectedAction(async (userId) => {
    const post = await prisma.postHistory.findUnique({
      where: { id, userId }
    });

    if (!post || post.isPublished) throw new Error('Post not found or already published.');

    if (post.stagedFileId) {
      try {
        const filePath = path.join(process.cwd(), "src/tmp", post.stagedFileId);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e: unknown) {
        logger.warn("Failed to delete temp file", e);
      }
    }

    const deleted = await prisma.postHistory.delete({ where: { id } });

    await revalidateDashboard();
    return deleted;
  });
}

/**
 * Saves AI-reviewed platform metadata for scheduled/pending posts.
 */
export async function saveStagedMetadata(stagedFileId: string, reviewedContent: Record<string, AIWriteResult>) {
  return protectedAction(async () => {
    const metadataPath = path.join(process.cwd(), "src/tmp", `${stagedFileId}.metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(reviewedContent, null, 2), "utf8");
    return { success: true };
  });
}

/**
 * Updates platform-specific results with custom AI content.
 */
export async function updatePlatformResultsAction(historyId: string, reviewedContent: Record<string, AIWriteResult>) {
  return protectedAction(async (userId) => {
    const history = await prisma.postHistory.findUnique({
      where: { id: historyId, userId },
      include: { platforms: true }
    });

    if (!history) throw new Error("History record not found.");

    // Update each platform result with its specific custom content
    await Promise.all(history.platforms.map((p) => {
      const custom = reviewedContent[p.platform];
      if (!custom) return Promise.resolve();

      return prisma.postPlatformResult.update({
        where: { id: p.id },
        data: {
          metadata: {
            customContent: {
              title: custom.title,
              description: custom.description,
              hashtags: custom.hashtags
            }
          }
        }
      });
    }));

    await revalidateDashboard();
    return { success: true };
  });
}
