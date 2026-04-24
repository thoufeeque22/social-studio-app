import { prisma } from '@/lib/core/prisma';
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
  reviewedContent?: Record<string, { title: string; description: string; hashtags?: string[] }>;
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
      let finalTitle = title;
      let finalDesc = description;
      
      if (params.reviewedContent && params.reviewedContent[p.platform]) {
        const custom = params.reviewedContent[p.platform];
        finalTitle = custom.title || title;
        const hashText = custom.hashtags && custom.hashtags.length > 0 ? `\n\n${custom.hashtags.join(' ')}` : '';
        finalDesc = (custom.description || description) + hashText;
      }

      console.log(`🚀 [SERVER-DISTRIBUTOR] Publishing to ${p.platform} (${p.accountName || p.accountId})`);
      
      const rawData = await distributeSinglePlatform({
        platform: p.platform,
        userId,
        filePath,
        title: finalTitle,
        description: finalDesc,
        videoFormat,
        accountId: p.accountId
      });

      const platformResult = {
        platform: p.platform,
        accountName: p.accountName,
        platformPostId: extractPlatformPostId(p.platform, rawData),
        permalink: generatePermalink(p.platform, rawData),
        status: 'success' as const,
        videoId: rawData?.videoId || rawData?.id,
        creationId: rawData?.creationId
      };

      // In-lined database logic to avoid importing from Server Actions files
      await prisma.postPlatformResult.upsert({
        where: {
          postHistoryId_platform: {
            postHistoryId: historyId,
            platform: p.platform
          }
        },
        update: { ...platformResult, postHistoryId: historyId },
        create: { ...platformResult, postHistoryId: historyId }
      });

      results.push(platformResult);

    } catch (err: any) {
      console.error(`❌ [SERVER-DISTRIBUTOR] Failed to publish to ${p.platform}:`, err.message);
      
      const errorResult = {
        platform: p.platform,
        status: 'failed' as const,
        errorMessage: err.message,
        resumableUrl: err.resumableUrl,
        videoId: err.videoId,
        creationId: err.creationId
      };

      await prisma.postPlatformResult.upsert({
        where: {
          postHistoryId_platform: {
            postHistoryId: historyId,
            platform: p.platform
          }
        },
        update: { ...errorResult, postHistoryId: historyId },
        create: { ...errorResult, postHistoryId: historyId }
      });
    }
  }

  return results;
}
