'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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
 * Upserts a single platform result for a post history entry.
 */
export async function upsertPlatformResult(historyId: string, result: PlatformResultInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  // Verify ownership
  const history = await prisma.postHistory.findUnique({
    where: { id: historyId, userId: session.user.id }
  });
  if (!history) throw new Error('History entry not found');

  return await prisma.postPlatformResult.upsert({
    where: {
      postHistoryId_platform: {
        postHistoryId: historyId,
        platform: result.platform
      }
    },
    update: {
      accountName: result.accountName,
      platformPostId: result.platformPostId,
      permalink: result.permalink,
      status: result.status,
      errorMessage: result.errorMessage,
      resumableUrl: result.resumableUrl,
      videoId: result.videoId,
      creationId: result.creationId,
    },
    create: {
      postHistoryId: historyId,
      platform: result.platform,
      accountName: result.accountName,
      platformPostId: result.platformPostId,
      permalink: result.permalink,
      status: result.status,
      errorMessage: result.errorMessage,
      resumableUrl: result.resumableUrl,
      videoId: result.videoId,
      creationId: result.creationId,
    }
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
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const postHistory = await prisma.postHistory.create({
    data: {
      userId: session.user.id,
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

  return { success: true, data: postHistory };
}

/**
 * Retries a failed upload attempt for a specific platform.
 */
export async function retryUploadAction(resultId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const result = await prisma.postPlatformResult.findUnique({
    where: { id: resultId },
    include: { postHistory: true }
  });

  if (!result || result.postHistory.userId !== session.user.id) {
    throw new Error('Upload result not found.');
  }

  // Increment retry count
  await prisma.postPlatformResult.update({
     where: { id: resultId },
     data: { 
       retryCount: { increment: 1 },
       lastRetryAt: new Date(),
       status: 'retrying',
       errorMessage: null
     }
  });

  try {
    const stagedFileId = result.postHistory.stagedFileId;
    if (!stagedFileId) throw new Error("Original staged file reference missing.");

    const path = await import('path');
    const filePath = path.join(process.cwd(), "src/tmp", stagedFileId);
    
    const fs = await import('fs');
    if (!fs.existsSync(filePath)) {
      throw new Error("Source video file has been purged from the server. Retries are only available for 24 hours.");
    }

    let platformResult;
    const title = result.postHistory.title;
    const description = result.postHistory.description || "";

    if (result.platform === 'youtube') {
      const { uploadToYouTube } = await import('@/lib/youtube');
      platformResult = await uploadToYouTube({
        userId: session.user.id,
        filePath,
        title,
        description,
        privacy: 'private',
        resumableUrl: result.resumableUrl || undefined
      });
    } else if (result.platform === 'facebook') {
      const { publishFacebookVideo, publishFacebookReel } = await import('@/lib/facebook');
      // For simplicity, we assume the tunnel URL is available for Meta to pull from
      let baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      const videoUrl = `${baseUrl}/api/media/${encodeURIComponent(stagedFileId)}`;

      if (result.postHistory.videoFormat === 'short') {
        platformResult = await publishFacebookReel({
          userId: session.user.id,
          videoUrl,
          description,
          videoId: result.videoId || undefined
        });
      } else {
        platformResult = await publishFacebookVideo({
          userId: session.user.id,
          videoUrl,
          title,
          description,
          videoId: result.videoId || undefined
        });
      }
    } else if (result.platform === 'instagram') {
      const { publishInstagramReel } = await import('@/lib/instagram');
      let baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
      const videoUrl = `${baseUrl}/api/media/${encodeURIComponent(stagedFileId)}`;

      platformResult = await publishInstagramReel({
        userId: session.user.id,
        videoUrl,
        caption: `${title}\n\n${description}`,
        creationId: result.creationId || undefined
      });
    } else {
      throw new Error(`Retry not yet supported for ${result.platform}`);
    }

    // Update with success
    await prisma.postPlatformResult.update({
      where: { id: resultId },
      data: { 
        status: 'success',
        platformPostId: (platformResult as any).id || (platformResult as any).videoId || (platformResult as any).platformPostId,
        permalink: result.permalink || null, // We could re-generate this
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
}

/**
 * Fetches upcoming scheduled posts for the current user.
 */
export async function getUpcomingPosts() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  return await prisma.postHistory.findMany({
    where: {
      userId: session.user.id,
      isPublished: false
    },
    orderBy: {
      scheduledAt: 'asc'
    },
    take: 5
  });
}


