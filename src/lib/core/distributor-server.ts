"use server";
import "server-only";

import path from 'path';
import { 
  formatPlatformCaption, 
  constructPublicVideoUrl 
} from './distributor-utils';

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
  fields = {}
}: {
  platform: string;
  userId: string;
  filePath: string;
  title: string;
  description: string;
  videoFormat: 'short' | 'long';
  accountId?: string;
  fields?: Record<string, any>;
}) {
  const finalCaption = formatPlatformCaption({
    title,
    description,
    platform
  });

  // MOCK_UPLOAD Check
  if (process.env.MOCK_UPLOAD === "true") {
    console.log(`🚀 [DISTRIBUTOR-SERVER] [MOCK MODE] Skipping real ${platform} distribution.`);
    return { id: `mock-${platform}-${Date.now()}`, success: true };
  }

  if (platform === 'youtube') {
    const { uploadToYouTube } = await import('@/lib/platforms/youtube');
    return await uploadToYouTube({
      userId,
      filePath,
      title,
      description: finalCaption,
      privacy: (fields.privacy as any) || 'public',
      accountId,
      resumableUrl: fields.resumableUrl
    });
  } 
  
  if (platform === 'facebook') {
    const { publishFacebookVideo, publishFacebookReel } = await import('@/lib/platforms/facebook');
    if (videoFormat === 'short') {
      return await publishFacebookReel({ userId, filePath, description: finalCaption, accountId, videoId: fields.videoId });
    } else {
      return await publishFacebookVideo({ userId, filePath, title, description: finalCaption, accountId, videoId: fields.videoId });
    }
  } 
  
  if (platform === 'instagram') {
    const { publishInstagramReel } = await import('@/lib/platforms/instagram');
    const videoUrl = constructPublicVideoUrl(path.basename(filePath));
    
    return await publishInstagramReel({ 
      userId, 
      filePath,
      caption: finalCaption,
      accountId,
      creationId: fields.creationId,
      musicId: fields.musicId
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

  throw new Error(`Platform ${platform} not supported for direct distribution.`);
}
