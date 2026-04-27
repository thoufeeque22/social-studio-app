import { AITier, StyleMode } from '../core/constants';

export type Platform = 'youtube' | 'instagram' | 'tiktok';

export interface AIWriteResult {
  title: string;
  description: string;
  hashtags: string[];
}

/**
 * AI Vibe-Writer
 * Generates platform-specific metadata using an LLM based on video context, AI tier, and style mode.
 */
export async function generatePostContent(
  tier: AITier,
  mode: StyleMode,
  rawText: string,
  videoContext: string,
  platform: Platform,
  visualData?: string[]
): Promise<AIWriteResult> {
  if (tier === 'Manual') {
    return {
      title: rawText || 'Untitled Video',
      description: videoContext || '',
      hashtags: ['#socialstudio'],
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured for production use.");
  }

  // System instructions tailored to the platform, tier, and mode
  let systemPrompt = `You are a social media copywriter expert. 
Target Platform: ${platform.toUpperCase()}.
AI Strategy: ${tier.toUpperCase()} mode.
Task: Write a title, description, and hashtags.
Output must be ONLY valid JSON in this format:
{
  "title": "Your Title",
  "description": "Your Description",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}
Always generate exactly 5 hashtags by default.`;

  if (visualData && visualData.length > 0) {
    systemPrompt += `\nContext: You have been provided with frames from the video. Analyze the VISUAL content to generate the most accurate and engaging title and description.`;
  }

  if (tier === 'Enrich') {
    systemPrompt += `\nGoal: The user has provided a draft. Your job is to ENRICH it—make it more engaging, fix grammar, and optimize for ${platform} while keeping the original intent.`;
  } else if (tier === 'Generate') {
    systemPrompt += `\nGoal: The user has provided a prompt or context. Your job is to GENERATE high-performing content from scratch for ${platform}.`;
  }

  if (platform === 'youtube') {
    systemPrompt += `\nConstraints: The title MUST be under 60 characters for YouTube Shorts. The description should be engaging and SEO-rich.`;
  } else if (platform === 'tiktok') {
    systemPrompt += `\nConstraints: Trendy, fast-paced language. Use trending TikTok hashtags. Description should be short and punchy. Maximum 5 hashtags allowed.`;
  } else if (platform === 'instagram') {
    systemPrompt += `\nConstraints: Aesthetic vibe, emojis allowed, use strategic niche hashtags. Modest description length. Maximum 5 hashtags allowed.`;
  }

  if (mode === 'Hook') {
    systemPrompt += `\nStyle: High-adrenaline, click-inducing, FOMO-driven hook. Make it impossible not to click.`;
  } else if (mode === 'SEO') {
    systemPrompt += `\nStyle: Search-optimized, informative, keyword-dense but readable.`;
  } else if (mode === 'Gen-Z') {
    systemPrompt += `\nStyle: Authentic, low-caps, gen-z slang, ironically detached but engaging. No cap.`;
  }

  const prompt = tier === 'Enrich' 
    ? `Draft Title: ${rawText}\nDraft Description: ${videoContext}`
    : `User Prompt: ${rawText}\nAdditional Context: ${videoContext}`;

  try {
    const parts: any[] = [{ text: `${systemPrompt}\n\n${prompt}` }];
    
    if (visualData && visualData.length > 0) {
      visualData.forEach(base64 => {
        // Ensure we only send the base64 part, removing the data URI prefix
        const base64Data = base64.includes(';base64,') 
          ? base64.split(';base64,')[1] 
          : base64;

        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: base64Data
          }
        });
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API returned ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (resultText) {
      const parsed = JSON.parse(resultText);
      return {
        title: parsed.title,
        description: parsed.description,
        hashtags: parsed.hashtags || [],
      };
    }
    throw new Error("Invalid response structure from LLM");
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
}



