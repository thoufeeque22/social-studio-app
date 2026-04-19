import { prisma } from './prisma';
import { upsertPlatformResultInternal } from '@/app/actions/history';
import path from 'path';

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

      if (p.platform === 'youtube') {
        const { uploadToYouTube } = await import('@/lib/youtube');
        rawData = await uploadToYouTube({
          userId,
          filePath,
          title,
          description,
          privacy: 'public'
        });
      } else if (p.platform === 'facebook') {
        const { publishFacebookVideo, publishFacebookReel } = await import('@/lib/facebook');
        const baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
        const videoUrl = `${baseUrl.replace(/\/$/, '')}/api/media/${encodeURIComponent(stagedFileId)}`;
        
        if (videoFormat === 'short') {
          rawData = await publishFacebookReel({ userId, videoUrl, description });
        } else {
          rawData = await publishFacebookVideo({ userId, videoUrl, title, description });
        }
      } else if (p.platform === 'instagram') {
        const { publishInstagramReel } = await import('@/lib/instagram');
        const baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
        const videoUrl = `${baseUrl.replace(/\/$/, '')}/api/media/${encodeURIComponent(stagedFileId)}`;
        
        rawData = await publishInstagramReel({ 
          userId, 
          videoUrl, 
          caption: `${title}\n\n${description}` 
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

// Helpers copied/adapted from upload-utils.ts for server-side use
function extractPlatformPostId(platform: string, data: any): string | null {
  if (platform === 'youtube') return data.id || null;
  if (platform === 'facebook' || platform === 'instagram') return data.id || data.videoId || null;
  if (platform === 'tiktok') return data.publish_id || null;
  return null;
}

function generatePermalink(platform: string, data: any): string | null {
  if (platform === 'youtube' && data.id) return `https://youtube.com/watch?v=${data.id}`;
  if (platform === 'facebook' && data.permalink_url) return data.permalink_url;
  // Others to be expanded
  return null;
}
