export type StyleMode = 'Hook' | 'SEO' | 'Gen-Z' | 'Manual';
export type Platform = 'youtube' | 'instagram' | 'tiktok';

export interface AIWriteResult {
  title: string;
  description: string;
  hashtags: string[];
}

/**
 * AI Vibe-Writer
 * Generates platform-specific metadata using an LLM based on video context and style mode.
 */
export async function generatePostContent(
  mode: StyleMode,
  rawText: string,
  videoContext: string,
  platform: Platform
): Promise<AIWriteResult> {
  if (mode === 'Manual') {
    return {
      title: rawText || 'Untitled Video',
      description: videoContext || '',
      hashtags: ['#socialstudio'],
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn("GEMINI_API_KEY is not set. Using mocked AI response.");
      return fallbackMockAI(mode, rawText, platform);
    }
    throw new Error("GEMINI_API_KEY is not configured for production use.");
  }

  // System instructions tailored to the platform and mode
  let systemPrompt = `You are a social media copywriter expert. 
Target Platform: ${platform.toUpperCase()}.
Task: Write a title, description, and hashtags based on the user's raw text and video context.
Output must be ONLY valid JSON in this format:
{
  "title": "Your Title",
  "description": "Your Description",
  "hashtags": ["#tag1", "#tag2"]
}`;

  if (platform === 'youtube') {
    systemPrompt += `\nConstraints: The title MUST be under 60 characters for YouTube Shorts. The description should be engaging and SEO-rich.`;
  } else if (platform === 'tiktok') {
    systemPrompt += `\nConstraints: Trendy, fast-paced language. Use trending TikTok hashtags. Description should be short and punchy.`;
  } else if (platform === 'instagram') {
    systemPrompt += `\nConstraints: Aesthetic vibe, emojis allowed, use strategic niche hashtags. Modest description length.`;
  }

  if (mode === 'Hook') {
    systemPrompt += `\nStyle: High-adrenaline, click-inducing, FOMO-driven hook. Make it impossible not to click.`;
  } else if (mode === 'SEO') {
    systemPrompt += `\nStyle: Search-optimized, informative, keyword-dense but readable.`;
  } else if (mode === 'Gen-Z') {
    systemPrompt += `\nStyle: Authentic, low-caps, gen-z slang, ironically detached but engaging. No cap.`;
  }

  const prompt = `Raw Text: ${rawText}\nVideo Context: ${videoContext}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
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
    if (process.env.NODE_ENV === 'development') {
      return fallbackMockAI(mode, rawText, platform);
    }
    throw error;
  }
}

function fallbackMockAI(mode: StyleMode, rawText: string, platform: Platform): AIWriteResult {
  // Simple fallback logic to demonstrate the pipeline
  let title = rawText || "My Awesome Video";
  if (platform === 'youtube' && title.length > 55) {
    title = title.substring(0, 52) + "...";
  }

  let description = "Watch this amazing new update! 🚀";
  if (mode === 'Hook') description = "You won't believe what happens at the end! 🤯👇";
  if (mode === 'Gen-Z') description = "this is living rent free in my head fr fr 💀";
  if (mode === 'SEO') description = "Detailed guide on mastering social media automation. Learn the best strategies today.";

  return {
    title: mode === 'Hook' ? `🔥 ${title}` : title,
    description,
    hashtags: ['#viral', `#${platform}`, `#${mode.toLowerCase()}`],
  };
}
