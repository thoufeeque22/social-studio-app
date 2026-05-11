"use server";

import { protectedAction } from "@/lib/core/action-utils";
import { generatePostContent, AIWriteResult } from "@/lib/utils/ai-writer";
import { AITier, StyleMode } from "@/lib/core/constants";
import { z } from "zod";
import { aiRateLimit, checkRateLimit } from "@/lib/core/ratelimit";
import { logger } from "@/lib/core/logger";

const AIPreviewSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  tier: z.enum(['Manual', 'Enrich', 'Generate']),
  mode: z.enum(['Smart', 'Gen-Z', 'SEO', 'Story', 'Custom']),
  platforms: z.array(z.string()).min(1, "At least one platform is required"),
  visualData: z.array(z.string()).optional(),
  customStyleText: z.string().optional(),
});

/**
 * GENERATES PREVIEWS FOR ALL SELECTED PLATFORMS.
 * used for the AI Review Step.
 */
export const getMultiPlatformAIPreviews = async (
  title: string,
  description: string,
  tier: AITier,
  mode: StyleMode,
  platforms: string[],
  visualData?: string[],
  customStyleText?: string
) => {
  return protectedAction(async (userId) => {
    // 1. Runtime Validation
    const validated = AIPreviewSchema.parse({ 
      title, 
      description, 
      tier, 
      mode, 
      platforms, 
      visualData, 
      customStyleText 
    });
    
    // Use validated values to ensure type safety and correctness
    const { 
      tier: vTier, 
      platforms: vPlatforms, 
      mode: vMode 
    } = validated;

    if (vTier === 'Manual') {
      throw new Error("Cannot generate previews in Manual mode.");
    }

    // 2. Rate Limiting
    await checkRateLimit(aiRateLimit, userId, "AI Generation limit reached. Please wait a minute.");

    logger.info(`Generating AI previews for user ${userId}`, { platforms: vPlatforms, tier: vTier, mode: vMode });

    const results: { platform: string, result: AIWriteResult }[] = [];

    for (const platform of vPlatforms) {
      try {
        const result = await generatePostContent(
          vTier,
          vMode,
          title,
          description,
          platform as "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin" | "twitter",
          visualData,
          customStyleText
        );
        results.push({ platform, result });
      } catch (err: unknown) {
        logger.error(`AI Preview Error for ${platform}`, err);
        results.push({ 
          platform, 
          result: { 
            title: title || "Strategy Placeholder", 
            description: `AI Error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try a manual prompt or a different video.`, 
            hashtags: [] 
          } as AIWriteResult 
        });
      }
    }
    
    // Convert array to record
    return results.reduce((acc, curr) => {
      acc[curr.platform] = curr.result;
      return acc;
    }, {} as Record<string, AIWriteResult>);
  });
};
