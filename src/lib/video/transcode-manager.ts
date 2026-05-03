import { prisma } from "@/lib/core/prisma";
import { checkTranscodeRequirement, transcodeForPlatform } from "./processor";
import path from "path";
import fs from "fs";
import { logger } from "@/lib/core/logger";

/**
 * Ensures a video is optimized for a specific platform.
 * Returns the path to the optimized video, or the original path if no transcoding is needed.
 */
export async function getOptimizedVideoPath(
  originalFileId: string,
  platform: string,
  postHistoryId?: string,
  accountId?: string
): Promise<string> {
  const originalPath = path.join(process.cwd(), "src/tmp", originalFileId);
  
  // 1. Check if we already have an optimized version in DB for this post/platform/account
  if (postHistoryId && accountId) {
    const result = await prisma.postPlatformResult.findUnique({
      where: {
        postHistoryId_platform_accountId: {
          postHistoryId,
          platform,
          accountId
        }
      }
    });

    if (result?.optimizedFileId) {
      const optimizedPath = path.join(process.cwd(), "src/tmp", result.optimizedFileId);
      if (fs.existsSync(optimizedPath)) {
        logger.info(`♻️ [TRANSCODER] Reusing optimized file: ${result.optimizedFileId}`);
        return optimizedPath;
      }
    }
  }

  // 2. Check if transcoding is actually required
  const { results } = await checkTranscodeRequirement(originalPath, [platform]);
  const platformResult = results[platform];

  if (!platformResult || !platformResult.needsTranscode) {
    logger.info(`✅ [TRANSCODER] No transcoding needed for ${platform}`);
    return originalPath;
  }

  logger.info(`⚙️ [TRANSCODER] Starting optimization for ${platform}: ${platformResult.reason}`);

  // 3. Mark as processing in DB (if postHistoryId provided)
  if (postHistoryId && accountId) {
    await prisma.postPlatformResult.upsert({
      where: {
        postHistoryId_platform_accountId: {
          postHistoryId,
          platform,
          accountId
        }
      },
      update: { transcodeStatus: 'processing' },
      create: { 
        postHistoryId, 
        platform, 
        accountId,
        transcodeStatus: 'processing',
        status: 'pending'
      }
    });
  }

  // 4. Run Transcoding
  try {
    const optimizedPath = await transcodeForPlatform(originalPath, platform);
    const optimizedFileId = path.basename(optimizedPath);

    logger.info(`✨ [TRANSCODER] Optimization complete: ${optimizedFileId}`);

    // 5. Update DB
    if (postHistoryId && accountId) {
      await prisma.postPlatformResult.update({
        where: {
          postHistoryId_platform_accountId: {
            postHistoryId,
            platform,
            accountId
          }
        },
        data: {
          transcodeStatus: 'completed',
          optimizedFileId: optimizedFileId
        }
      });
    }

    return optimizedPath;
  } catch (err: any) {
    logger.error(`❌ [TRANSCODER] Optimization failed for ${platform}: ${err.message}`);
    
    if (postHistoryId && accountId) {
      await prisma.postPlatformResult.update({
        where: {
          postHistoryId_platform_accountId: {
            postHistoryId,
            platform,
            accountId
          }
        },
        data: {
          transcodeStatus: 'failed',
          errorMessage: `Transcoding failed: ${err.message}`
        }
      });
    }
    
    throw err;
  }
}
