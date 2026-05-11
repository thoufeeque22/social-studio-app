"use strict";
import path from 'path';
import { 
  formatPlatformCaption, 
  constructPublicVideoUrl 
} from './distributor-utils';
import { logger } from '@/lib/core/logger';

/**
 * ORCHESTRATES PUBLISHING TO A SINGLE PLATFORM.
 * strictly SERVER-ONLY (Node.js required).
 */
export async function distributeSinglePlatform({
  platform,
  userId,
  filePath,
  title,
  description,
  videoFormat,
  accountId,
  fields = {},
  onProgress: progressCallback
}: {
  platform: string;
  userId: string;
  filePath: string;
  title: string;
  description: string;
  videoFormat: 'short' | 'long';
  accountId?: string;
  fields?: Record<string, unknown>;
  onProgress?: (percent: number) => void;
}) {
  const finalCaption = formatPlatformCaption({
    title,
    description,
    platform
  });

  if (process.env.MOCK_UPLOAD === "true") {
    logger.info(`🚀 [DISTRIBUTOR-SERVER] [MOCK MODE] Skipping real ${platform} distribution.`);
    return { id: `mock-${platform}-${Date.now()}`, success: true };
  }

  if (platform === 'youtube') {
    const { uploadToYouTube } = await import('@/lib/platforms/youtube');
    const result = await uploadToYouTube({
      userId,
      filePath,
      title,
      description: finalCaption,
      privacy: ((fields.privacy as string) || 'public') as "private" | "public" | "unlisted",
      accountId,
      resumableUrl: fields.resumableUrl as string | undefined,
      onProgress: progressCallback
    });
    return result.data;
  } 
  
  if (platform === 'facebook') {
    const { publishFacebookVideo, publishFacebookReel } = await import('@/lib/platforms/facebook');
    if (videoFormat === 'short') {
      return await publishFacebookReel({ userId, filePath, description: finalCaption, accountId, videoId: fields.videoId as string | undefined, onProgress: progressCallback });
    } else {
      return await publishFacebookVideo({ userId, filePath, title, description: finalCaption, accountId, videoId: fields.videoId as string | undefined });
    }
  } 
  
  if (platform === 'instagram') {
    const { publishInstagramReel } = await import('@/lib/platforms/instagram');
    
    return await publishInstagramReel({ 
      userId, 
      filePath,
      caption: finalCaption,
      accountId,
      creationId: fields.creationId as string | undefined,
      musicId: fields.musicId as string | undefined,
      onProgress: progressCallback
    });
  } 
  
  if (platform === 'tiktok') {
    const { publishTikTokVideo } = await import('@/lib/platforms/tiktok');
    return await publishTikTokVideo({
      userId,
      videoPath: filePath,
      title: finalCaption,
      accountId
    });
  }

  if (platform.startsWith('local')) {
    const { publishLocalReel } = await import('@/lib/platforms/local');
    return await publishLocalReel({
      userId,
      filePath,
      onProgress: progressCallback
    });
  }

  throw new Error(`Platform ${platform} not supported for direct distribution.`);
}
