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

export interface PlatformResultInput {
  platform: string;
  accountName?: string | null;
  platformPostId?: string | null;
  permalink?: string | null;
  status: 'success' | 'failed' | 'retrying' | 'pending';
  errorMessage?: string | null;
  resumableUrl?: string | null;
  videoId?: string | null;
  creationId?: string | null;
}

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
      postHistoryId_platform: {
        postHistoryId: historyId,
        platform: result.platform
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

export interface SavePostHistoryInput {
  title: string;
  description?: string;
  videoFormat: 'short' | 'long';
  platforms: PlatformResultInput[];
  stagedFileId?: string; 
  scheduledAt?: Date | null;
  isPublished?: boolean;
}

export async function savePostHistory(data: SavePostHistoryInput) {
  return protectedAction(async (userId) => {
    const postHistory = await prisma.postHistory.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        videoFormat: data.videoFormat,
        stagedFileId: data.stagedFileId,
        scheduledAt: data.scheduledAt,
        isPublished: data.isPublished ?? true,
        platforms: {
          create: data.platforms.map((p) => ({
            platform: p.platform,
            accountName: p.accountName || null,
            platformPostId: p.platformPostId || null,
            permalink: p.permalink || null,
            status: p.status,
            errorMessage: p.errorMessage || null,
            resumableUrl: p.resumableUrl || null,
            videoId: p.videoId || null,
            creationId: p.creationId || null,
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
 * NOW USES CENTRALIZED DISTRIBUTION LOGIC.
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
        videoFormat: result.postHistory.videoFormat as any,
        accountId: result.accountId || undefined,
        fields: {
          resumableUrl: result.resumableUrl,
          videoId: result.videoId,
          creationId: result.creationId
        }
      });

      // 3. Update with success
      await prisma.postPlatformResult.update({
        where: { id: resultId },
        data: { 
          status: 'success',
          platformPostId: extractPlatformPostId(result.platform, platformResult),
          permalink: generatePermalink(result.platform, platformResult),
          videoId: (platformResult as any).videoId || (platformResult as any).id,
          creationId: (platformResult as any).creationId,
          errorMessage: null
        }
      });

      return { success: true };
    } catch (err: any) {
      console.error(`Retry attempt failed for ${result.platform}:`, err);
      await prisma.postPlatformResult.update({
        where: { id: resultId },
        data: { 
          status: 'failed', 
          errorMessage: err.message,
          resumableUrl: err.resumableUrl || result.resumableUrl,
          videoId: err.videoId || result.videoId,
          creationId: err.creationId || result.creationId
        }
      });
      return { success: false, error: err.message };
    }
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
      } catch (e) {
        console.warn("Failed to delete temp file:", e);
      }
    }

    const deleted = await prisma.postHistory.delete({ where: { id } });

    await revalidateDashboard();
    return deleted;
  });
}

import { AIWriteResult } from '@/lib/utils/ai-writer';

/**
 * Saves AI-reviewed platform metadata for scheduled posts.
 */
export async function saveStagedMetadata(stagedFileId: string, reviewedContent: Record<string, AIWriteResult>) {
  return protectedAction(async (userId) => {
    const metadataPath = path.join(process.cwd(), "src/tmp", `${stagedFileId}.metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(reviewedContent, null, 2), "utf8");
    return { success: true };
  });
}
