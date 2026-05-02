import { prisma } from '@/lib/core/prisma';
import path from 'path';
import { 
  extractPlatformPostId, 
  generatePermalink, 
  constructPublicVideoUrl,
  formatPlatformCaption
} from '@/lib/core/distributor-utils';
import { distributeSinglePlatform } from '@/lib/core/distributor-server';
import { getOptimizedVideoPath } from '@/lib/video/transcode-manager';

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
      console.log(`🚀 [SERVER-DISTRIBUTOR] Processing platform: ${p.platform}`);
      
      // 1. Fetch existing result to see if we have a resumable session or cancellation
      const existingResult = await prisma.postPlatformResult.findUnique({
        where: {
          postHistoryId_platform_accountId: {
            postHistoryId: historyId,
            platform: p.platform,
            accountId: p.accountId
          }
        }
      });

      console.log(`🚀 [SERVER-DISTRIBUTOR] Existing result status for ${p.platform}: ${existingResult?.status || 'none'}`);

      if (existingResult?.status === 'cancelled') {
        console.log(`⏹️ [SERVER-DISTRIBUTOR] Skipping ${p.platform} - User cancelled distribution.`);
        results.push(existingResult as any);
        continue;
      }

      let finalTitle = title;
      let finalDesc = description;
      
      const customContent = (existingResult?.metadata as any)?.customContent || params.reviewedContent?.[p.platform];
      
      if (customContent) {
        finalTitle = customContent.title || title;
        const hashText = customContent.hashtags && customContent.hashtags.length > 0 ? `\n\n${customContent.hashtags.join(' ')}` : '';
        finalDesc = (customContent.description || description) + hashText;
      }

      console.log(`🚀 [SERVER-DISTRIBUTOR] Publishing to ${p.platform} (${p.accountName || p.accountId}) ${existingResult?.resumableUrl ? '[RESUMING]' : ''}`);
      
      // 1.5 Ensure the record exists for onProgress updates
      console.log(`🚀 [SERVER-DISTRIBUTOR] Updating status to uploading for ${p.platform}`);
      const currentResult = await prisma.postPlatformResult.upsert({
        where: {
          postHistoryId_platform_accountId: {
            postHistoryId: historyId,
            platform: p.platform,
            accountId: p.accountId
          }
        },
        update: { status: 'uploading' },
        create: {
          postHistoryId: historyId,
          platform: p.platform,
          accountId: p.accountId,
          accountName: p.accountName,
          status: 'uploading'
        }
      });
      
      // 2. Optimization check
      console.log(`🚀 [SERVER-DISTRIBUTOR] Starting optimization check for ${p.platform}`);
      let activeFilePath = filePath;
      try {
        activeFilePath = await getOptimizedVideoPath(stagedFileId, p.platform, historyId, p.accountId);
      } catch (optErr) {
        console.warn(`⚠️ [SERVER-DISTRIBUTOR] Optimization failed for ${p.platform}, using original.`, optErr);
      }

      console.log(`🚀 [SERVER-DISTRIBUTOR] Calling distributeSinglePlatform for ${p.platform}`);
      const rawData = await distributeSinglePlatform({
        platform: p.platform,
        userId,
        filePath: activeFilePath,
        title: finalTitle,
        description: finalDesc,
        videoFormat,
        accountId: p.accountId,
        fields: {
          resumableUrl: existingResult?.resumableUrl,
          videoId: existingResult?.videoId,
          creationId: existingResult?.creationId
        },
        onProgress: async (percent) => {
          await prisma.postPlatformResult.update({
            where: { id: currentResult.id },
            data: { progress: Math.round(percent) }
          }).catch(e => console.error("Failed to update progress:", e));
        }
      });

      const platformResult = {
        platform: p.platform,
        accountId: p.accountId,
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
          postHistoryId_platform_accountId: {
            postHistoryId: historyId,
            platform: p.platform,
            accountId: p.accountId
          }
        },
        update: { ...platformResult, postHistoryId: historyId },
        create: { ...platformResult, postHistoryId: historyId }
      });

      results.push(platformResult);

    } catch (err: any) {
      console.error(`❌ [SERVER-DISTRIBUTOR] Failed to publish to ${p.platform}:`, err.message);
      
      const errorPayload = {
        platform: p.platform,
        accountId: p.accountId,
        status: 'failed' as const,
        errorMessage: err.message,
        resumableUrl: err.resumableUrl,
        videoId: err.videoId,
        creationId: err.creationId,
        lastRetryAt: new Date()
      };

      await prisma.postPlatformResult.upsert({
        where: {
          postHistoryId_platform_accountId: {
            postHistoryId: historyId,
            platform: p.platform,
            accountId: p.accountId
          }
        },
        update: { 
          ...errorPayload, 
          retryCount: { increment: 1 } 
        },
        create: { 
          ...errorPayload, 
          postHistoryId: historyId,
          retryCount: 1
        }
      });
    }
  }

  return results;
}
