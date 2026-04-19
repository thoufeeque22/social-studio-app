import { prisma } from './prisma';
import { upsertPlatformResultInternal } from '@/app/actions/history';
import path from 'path';
import { 
  extractPlatformPostId, 
  generatePermalink, 
  constructPublicVideoUrl,
  formatPlatformCaption
} from '@/lib/core/distributor-utils';
import { distributeSinglePlatform } from '@/lib/core/distributor-server';

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
      
      const rawData = await distributeSinglePlatform({
        platform: p.platform,
        userId,
        filePath,
        title,
        description,
        videoFormat,
        accountId: p.accountId
      });

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
