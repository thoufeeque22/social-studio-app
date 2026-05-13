import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

/**
 * Analyzes video keyframes and suggests the best thumbnail for high CTR.
 */
export async function rankThumbnails(framesBase64: string[]): Promise<{ bestFrameIndex: number; reason: string }> {
  const prompt = `You are a social media thumbnail expert. I am providing ${framesBase64.length} keyframes from a video. 
Please select the best frame to use as a high-click-through-rate (CTR) thumbnail for YouTube/TikTok/Instagram.
Consider:
1. Faces and expressions (visible, emotive)
2. Contrast and clarity (not blurry)
3. Action or visual interest

Return the index of the best frame and your reasoning.`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...framesBase64.map(frame => ({
          type: 'image' as const,
          image: frame, // ai-sdk supports data URLs directly
        }))
      ]
    }
  ];

  const { object } = await generateObject({
    model: google('gemini-1.5-pro'),
    schema: z.object({
      bestFrameIndex: z.number().describe('The 0-based index of the best frame'),
      reason: z.string().describe('Explanation of why this frame is the best for CTR'),
    }),
    messages,
  });

  return object;
}
