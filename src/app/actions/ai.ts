"use server";

import { protectedAction } from "@/lib/core/action-utils";
import { generatePostContent, StyleMode, AIWriteResult } from "@/lib/utils/ai-writer";

/**
 * GENERATES PREVIEWS FOR ALL SELECTED PLATFORMS.
 * used for the AI Review Step.
 */
export const getMultiPlatformAIPreviews = async (
  title: string,
  description: string,
  mode: StyleMode,
  platforms: string[]
) => {
  return protectedAction(async () => {
    if (mode === 'Manual') {
      throw new Error("Cannot generate previews in Manual mode.");
    }

    const previewPromises = platforms.map(async (platform) => {
      try {
        const result = await generatePostContent(
          mode,
          title,
          description,
          platform as any
        );
        return { platform, result };
      } catch (err) {
        console.error(`AI Preview Error for ${platform}:`, err);
        return { 
          platform, 
          result: { 
            title: title || "Strategy Placeholder", 
            description: "Failed to generate strategy. Resetting to manual.", 
            hashtags: [] 
          } as AIWriteResult 
        };
      }
    });

    const results = await Promise.all(previewPromises);
    
    // Convert array to record
    return results.reduce((acc, curr) => {
      acc[curr.platform] = curr.result;
      return acc;
    }, {} as Record<string, AIWriteResult>);
  });
};
