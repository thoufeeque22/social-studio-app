import { prisma } from './prisma';
import { upsertPlatformResultInternal } from '@/app/actions/history';
import path from 'path';
import { 
  extractPlatformPostId, 
  generatePermalink, 
  constructPublicVideoUrl,
  formatPlatformCaption 
} from '@/lib/core/distributor-utils';

export interface ServerDistributeParams {
  stagedFileId: string;
  userId: string;
  historyId: string;
  title: string;
  description: string;
  videoFormat: 'short' | 'long';
  platforms: {
    platform: string;
    accountId: string;
    accountName: string | null;
  }[];
}

/**
 * SERVER-ONLY logic for distributing posts.
 * Bypasses internal HTTP APIs and talks directly to platform SDKs/Logic.
 */
export async function distributeToPlatformsServer(params: ServerDistributeParams) {
  const { stagedFileId, userId, historyId, title, description, videoFormat, platforms } = params;

  console.log(`👷 [SERVER-DISTRIBUTOR] Starting distribution for post ${historyId}`);

  const filePath = path.join(process.cwd(), "src/tmp", stagedFileId);
  const results: any[] = [];

  for (const p of platforms) {
    try {
      console.log(`🚀 [SERVER-DISTRIBUTOR] Publishing to ${p.platform} (${p.accountName || p.accountId})`);
      
      let rawData: any;
      const finalCaption = formatPlatformCaption({
        title,
        description,
        platform: p.platform
      });

      // MOCK_UPLOAD Check
      if (process.env.MOCK_UPLOAD === "true") {
        console.log(`🚀 [SERVER-DISTRIBUTOR] [MOCK MODE] Skipping real ${p.platform} distribution.`);
        rawData = { id: `mock-${p.platform}-${Date.now()}`, success: true };
      } else if (p.platform === 'youtube') {
        const { uploadToYouTube } = await import('@/lib/platforms/youtube');
        rawData = await uploadToYouTube({
          userId,
          filePath,
          title,
          description: finalCaption,
          privacy: 'public',
          accountId: p.accountId
        });
      } else if (p.platform === 'facebook') {
        const { publishFacebookVideo, publishFacebookReel } = await import('@/lib/platforms/facebook');
        const videoUrl = constructPublicVideoUrl(stagedFileId);
        
        if (videoFormat === 'short') {
          rawData = await publishFacebookReel({ userId, videoUrl, description: finalCaption, accountId: p.accountId });
        } else {
          rawData = await publishFacebookVideo({ userId, videoUrl, title, description: finalCaption, accountId: p.accountId });
        }
      } else if (p.platform === 'instagram') {
        const { publishInstagramReel } = await import('@/lib/platforms/instagram');
        const videoUrl = constructPublicVideoUrl(stagedFileId);
        
        rawData = await publishInstagramReel({ 
          userId, 
          filePath, // Use filePath for binary upload if possible, or videoUrl
          caption: finalCaption,
          accountId: p.accountId
        });
      } else if (p.platform === 'tiktok') {
        const { uploadToTikTok } = await import('@/lib/platforms/tiktok');
        rawData = await uploadToTikTok({
          userId,
          filePath,
          title: finalCaption,
          accountId: p.accountId
        });
      } else {
        console.warn(`⚠️ [SERVER-DISTRIBUTOR] Platform ${p.platform} not supported in direct mode yet.`);
        continue;
      }

      const platformResult = {
        platform: p.platform,
        accountName: p.accountName,
        platformPostId: extractPlatformPostId(p.platform, rawData),
        permalink: generatePermalink(p.platform, rawData),
        status: 'success' as const,
        videoId: rawData.videoId || rawData.id,
        creationId: rawData.creationId
      };

      await upsertPlatformResultInternal(userId, historyId, platformResult);
      results.push(platformResult);

    } catch (err: any) {
      console.error(`❌ [SERVER-DISTRIBUTOR] Failed to publish to ${p.platform}:`, err.message);
      await upsertPlatformResultInternal(userId, historyId, {
        platform: p.platform,
        status: 'failed',
        errorMessage: err.message
      });
    }
  }

  return results;
}
