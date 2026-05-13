'use server';

import { prisma } from '@/lib/core/prisma';
import { protectedAction } from '@/lib/core/action-utils';
import { 
  getUpcomingPosts, 
  updateScheduledPost, 
  deleteScheduledPost,
  savePostHistory
} from '@/app/actions/history';

/**
 * Tool: List the user's upcoming scheduled posts.
 */
export async function listUpcomingPostsTool() {
  return protectedAction(async () => {
    const posts = await getUpcomingPosts();
    return posts;
  });
}

/**
 * Tool: List videos available in the staged gallery.
 */
export async function getMediaGalleryTool() {
  return protectedAction(async (userId) => {
    const assets = await prisma.galleryAsset.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return assets.map(a => ({
      fileId: a.fileId,
      fileName: a.fileName,
      fileSize: a.fileSize ? Number(a.fileSize) : null,
      createdAt: a.createdAt
    }));
  });
}

/**
 * Tool: Schedule a video from the gallery.
 */
export async function scheduleVideoTool(params: {
  fileId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  platforms: string[];
}) {
  return protectedAction(async () => {
    const platformsInput = params.platforms.map(p => ({
      platform: p,
      status: 'pending' as const,
    }));

    const result = await savePostHistory({
      title: params.title,
      description: params.description,
      videoFormat: 'short', // Assuming short for social distribution
      platforms: platformsInput,
      stagedFileId: params.fileId,
      scheduledAt: new Date(params.scheduledAt),
      isPublished: false
    });

    return result;
  });
}

/**
 * Tool: Update an existing scheduled post.
 */
export async function updatePostTool(id: string, data: {
  title?: string;
  description?: string;
  scheduledAt?: string;
}) {
  return protectedAction(async () => {
    return await updateScheduledPost(id, data);
  });
}

/**
 * Tool: Cancel/Delete a scheduled post.
 */
export async function cancelPostTool(id: string) {
  return protectedAction(async () => {
    return await deleteScheduledPost(id);
  });
}
