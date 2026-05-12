import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOllama } from 'ai-sdk-ollama';
import { streamText, tool, convertToModelMessages } from 'ai';
import { z } from 'zod';
import { auth } from '@/auth';
import { aiRateLimit, checkRateLimit } from '@/lib/core/ratelimit';
import { logger } from '@/lib/core/logger';
import * as Sentry from '@sentry/nextjs';
import { 
  listUpcomingPostsTool, 
  getMediaGalleryTool, 
  scheduleVideoTool, 
  updatePostTool, 
  cancelPostTool 
} from '@/lib/actions/ai-chat';
import { OLLAMA_DEFAULT_BASE_URL, OLLAMA_DEFAULT_MODEL } from '@/lib/core/constants';

// Initialize Google provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || 'no-key',
  apiVersion: 'v1',
});

// Initialize Ollama provider
const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL || OLLAMA_DEFAULT_BASE_URL,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * AI Chat API Route
 * Handles conversational assistant with tool calling capabilities.
 */
export async function POST(req: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. Rate Limiting check
    await checkRateLimit(aiRateLimit, userId, "Chat limit reached. Please wait a minute.");

    const { messages } = await req.json();
    const modelMessages = await convertToModelMessages(messages);

    // 2. Determine which model to use
    const useOllama = process.env.USE_OLLAMA === 'true' || !process.env.GOOGLE_API_KEY;
    const modelId = useOllama ? (process.env.OLLAMA_MODEL || OLLAMA_DEFAULT_MODEL) : 'gemini-1.5-flash-latest';
    const model = useOllama ? ollama(modelId) : google(modelId);

    logger.info("Starting AI chat session", { userId, useOllama, modelId });

    // 3. Initialize streaming with Vercel AI SDK
    const result = streamText({
      model,
      messages: modelMessages,
      maxSteps: 5,
      onFinish: (event) => {
        logger.info("Chat finished", { text: event.text });
      },
      system: `You are the Social Studio AI Assistant. You help users manage their social media content. 
      You can list upcoming posts, view staged media, schedule new posts, update existing ones, and cancel/delete schedules. 
      Always be professional, helpful, and concise. 
      
      CRITICAL: After you call a tool, you MUST ALWAYS provide a short summary of the results in plain text to the user.
      Start your summary with "I've checked..." or "I have processed..." to acknowledge the action.
      DO NOT return an empty response. Even if there are no results, say so clearly.
      Example: "I've checked your schedule and you have no upcoming posts." or "I have scheduled your video for tomorrow at 10 AM."
      
      When scheduling, ensure you have a fileId from the media gallery. 
      If a user asks what they have available, use get_media_gallery.
      If they want to see what's planned, use list_upcoming_posts.`,
      tools: {
        // ... (tools remain same)
        list_upcoming_posts: tool({
          description: 'Retrieve the user\'s scheduled posts.',
          inputSchema: z.object({}),
          execute: async () => {
            logger.info("Tool: list_upcoming_posts");
            try {
              const res = await listUpcomingPostsTool();
              logger.info("Tool result: list_upcoming_posts", { count: res?.length });
              if (!res || res.length === 0) {
                return "No upcoming posts found.";
              }
              return res;
            } catch (error: unknown) {
              Sentry.captureException(error);
              return { error: "Failed to list upcoming posts." };
            }
          },
        }),
        get_media_gallery: tool({
          description: 'List videos available in the staged gallery for scheduling.',
          inputSchema: z.object({}),
          execute: async () => {
            logger.info("Tool: get_media_gallery");
            try {
              const res = await getMediaGalleryTool();
              logger.info("Tool result: get_media_gallery", { count: res?.length });
              return res ?? { success: true, assets: [] };
            } catch (error: unknown) {
              Sentry.captureException(error);
              return { error: "Failed to fetch media gallery." };
            }
          },
        }),
        schedule_video: tool({
          description: 'Schedule a video from the gallery to social platforms.',
          inputSchema: z.object({
            fileId: z.string().describe('The ID of the file from the media gallery.'),
            title: z.string().describe('The title for the post.'),
            description: z.string().optional().describe('The description for the post.'),
            scheduledAt: z.string().describe('ISO date string for when to schedule the post.'),
            platforms: z.array(z.string()).describe('List of platforms to schedule to (e.g., youtube, tiktok, instagram).'),
          }),
          execute: async (params) => {
            logger.info("Tool: schedule_video", params);
            try {
              const res = await scheduleVideoTool(params);
              logger.info("Tool result: schedule_video", { success: !!res });
              return res ?? { success: true };
            } catch (error: unknown) {
              Sentry.captureException(error);
              return { error: "Failed to schedule video." };
            }
          },
        }),
        update_post: tool({
          description: 'Update details of an existing scheduled post.',
          inputSchema: z.object({
            id: z.string().describe('The ID of the scheduled post.'),
            data: z.object({
              title: z.string().optional(),
              description: z.string().optional(),
              scheduledAt: z.string().optional(),
            }),
          }),
          execute: async ({ id, data }) => {
            try {
              const res = await updatePostTool(id, data);
              return res ?? { success: true };
            } catch (error: unknown) {
              Sentry.captureException(error);
              return { error: "Failed to update post." };
            }
          },
        }),
        cancel_post: tool({
          description: 'Delete a scheduled post.',
          inputSchema: z.object({
            id: z.string().describe('The ID of the scheduled post to cancel.'),
          }),
          execute: async ({ id }) => {
            try {
              const res = await cancelPostTool(id);
              return res ?? { success: true };
            } catch (error: unknown) {
              Sentry.captureException(error);
              return { error: "Failed to cancel post." };
            }
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    logger.error("Chat API Error", error);
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
