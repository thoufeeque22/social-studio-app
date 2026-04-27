"use server";

import { protectedAction } from "@/lib/core/action-utils";
import { generatePostContent, AIWriteResult } from "@/lib/utils/ai-writer";
import { AITier, StyleMode } from "@/lib/core/constants";

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
  visualData?: string[]
) => {
  return protectedAction(async () => {
    if (tier === 'Manual') {
      throw new Error("Cannot generate previews in Manual mode.");
    }

    const results: { platform: string, result: AIWriteResult }[] = [];

    for (const platform of platforms) {
      try {
        const result = await generatePostContent(
          tier,
          mode,
          title,
          description,
          platform as any,
          visualData
        );
        results.push({ platform, result });
      } catch (err: any) {
        console.error(`AI Preview Error for ${platform}:`, err);
        results.push({ 
          platform, 
          result: { 
            title: title || "Strategy Placeholder", 
            description: `AI Error: ${err.message || 'Unknown error'}. Please try a manual prompt or a different video.`, 
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
