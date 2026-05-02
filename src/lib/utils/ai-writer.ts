import { 
  AITier, 
  StyleMode, 
  GEMINI_FALLBACK_MODELS,
  OLLAMA_DEFAULT_BASE_URL,
  OLLAMA_DEFAULT_MODEL
} from '../core/constants';

export type Platform = 'youtube' | 'instagram' | 'tiktok';

export interface AIWriteResult {
  title: string;
  description: string;
  hashtags: string[];
}

interface Part {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

function buildSystemPrompt(platform: Platform, tier: AITier, mode: StyleMode, hasVisualData: boolean): string {
  let prompt = `You are a social media copywriter expert. 
Target Platform: ${(platform || "general").toUpperCase()}.
AI Strategy: ${(tier || "generate").toUpperCase()} mode.
Task: Write a title, description, and hashtags.
Output must be ONLY valid JSON in this format:
{
  "title": "Your Title",
  "description": "Your Description",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}
Always generate exactly 5 hashtags by default.`;

  if (hasVisualData) {
    prompt += `\nContext: You have been provided with frames from the video. Analyze the VISUAL content to generate the most accurate and engaging title and description.`;
  }

  if (tier === 'Enrich') {
    prompt += `\nGoal: The user has provided a draft. Your job is to ENRICH it—make it more engaging, fix grammar, and optimize for ${platform} while keeping the original intent.`;
  } else if (tier === 'Generate') {
    prompt += `\nGoal: The user has provided a prompt or context. Your job is to GENERATE high-performing content from scratch for ${platform}.`;
  }

  const platformConstraints: Record<Platform, string> = {
    youtube: `\nConstraints: 
- YouTube is a SEARCH engine. Prioritize SEO and Search Intent.
- The Title MUST be under 60 characters and lead with high-volume keywords.
- The Description must be keyword-dense, include a summary of the video, and use searchable phrases.
- Tone: Informative, authoritative, yet engaging.`,
    tiktok: `\nConstraints: 
- TikTok is an ATTENTION engine. Prioritize the HOOK.
- The Description must start with a scroll-stopping statement or a curiosity gap.
- Use trendy, high-energy language and Gen-Z appropriate slang if it fits the vibe.
- Keep the caption short; the visuals do the talking. Maximum 5 hashtags.
- Tone: High-energy, raw, authentic, and fast-paced.`,
    instagram: `\nConstraints: 
- Instagram is a LIFESTYLE engine. Prioritize Aesthetics and Community.
- Use emojis strategically to break up text and add personality.
- Captions should be relatable, storyteller-focused, or highly curated.
- Include a clear 'Link in Bio' or 'Save for Later' call to action.
- Tone: Aesthetic, aspirational, relatable, and community-driven.`
  };
  
  if (platformConstraints[platform]) {
    prompt += platformConstraints[platform];
  }

  let activeMode = mode;
  if (mode === 'Smart') {
    if (platform === 'youtube') activeMode = 'SEO';
    else if (platform === 'tiktok') activeMode = 'Hook';
    else if (platform === 'instagram') activeMode = 'Story';
    else activeMode = 'Value'; // Default fallback
  }

  const styleConstraints: Record<StyleMode, string> = {
    Smart: `\nStyle: PLATFORM-OPTIMIZED. You are in 'Smart Mode'. Switch your strategy dynamically to the absolute best cultural fit for ${platform}.`,
    Hook: `\nStyle: ADRENALINE. The first sentence must be a 'pattern interrupt' that stops the scroll immediately. Focus on intense curiosity or a bold claim.`,
    SEO: `\nStyle: DISCOVERABILITY. Focus on semantic keywords and phrases that people actually type into search bars. Structure content logically.`,
    "Gen-Z": `\nStyle: AUTHENTICITY. Use lowercase, ironical detachment, and specific slang like 'no cap', 'bet', or 'fr'. Avoid looking like a 'brand trying too hard'.`,
    Story: `\nStyle: NARRATIVE. Use the 'Hero's Journey' or a simple 'Problem-Agitation-Solution' framework. Make the viewer care about the outcome.`,
    Value: `\nStyle: EDUCATIONAL. Provide a 'quick win' or a 'did you know' fact. Focus on utility and being helpful.`,
    Sales: `\nStyle: CONVERSION. Clear benefits, scarcity, and a strong, direct Call to Action. Focus on the result the user gets.`
  };

  if (styleConstraints[activeMode]) {
    prompt += styleConstraints[activeMode];
  }

  return prompt;
}

async function fetchFromOllama(systemPrompt: string, prompt: string): Promise<AIWriteResult> {
  const baseUrl = process.env.OLLAMA_BASE_URL || OLLAMA_DEFAULT_BASE_URL;
  const model = process.env.OLLAMA_MODEL || OLLAMA_DEFAULT_MODEL;

  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: `${systemPrompt}\n\n${prompt}`,
        format: "json",
        stream: false,
        options: {
          temperature: 0.7,
        }
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama API returned ${res.status}`);
    }

    const data = await res.json();
    const resultText = data.response;
    
    if (resultText) {
      const parsed = JSON.parse(resultText);
      return {
        title: parsed.title,
        description: parsed.description,
        hashtags: parsed.hashtags || [],
      };
    }
    throw new Error("Invalid response structure from Ollama");
  } catch (err) {
    console.error("Ollama Fallback Error:", err);
    throw err;
  }
}

async function fetchWithFallback(apiKey: string, requestBody: string): Promise<Response> {
  let response: Response | null = null;
  let lastError: Error | null = null;

  for (const model of GEMINI_FALLBACK_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      if (res.ok) {
        response = res;
        console.log(`Successfully generated content using model: ${model}`);
        break;
      } else if (res.status === 401 || res.status === 403) {
        throw new Error("Invalid or expired GEMINI_API_KEY. Check your dashboard.");
      } else if (res.status === 429) {
        throw new Error("API Rate Limit Exceeded. Please wait a minute before trying again.");
      } else {
        console.warn(`Model ${model} failed with status: ${res.status}`);
        lastError = new Error(`LLM API returned ${res.status} for model ${model}`);
      }
    } catch (err: unknown) {
      console.warn(`Model ${model} encountered an error:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!response) {
    throw lastError || new Error("All LLM fallback models failed.");
  }

  return response;
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
  const isProduction = process.env.NODE_ENV === 'production';
  if (tier === 'Manual') {
    return {
      title: rawText || 'Untitled Video',
      description: videoContext || '',
      hashtags: ['#socialstudio'],
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const systemPrompt = buildSystemPrompt(platform, tier, mode, !!visualData && visualData.length > 0);
  const prompt = tier === 'Enrich' 
    ? `Draft Title: ${rawText}\nDraft Description: ${videoContext}`
    : `User Prompt: ${rawText}\nAdditional Context: ${videoContext}`;

  // IF NO API KEY, TRY OLLAMA IMMEDIATELY
  if (!apiKey) {
    if (isProduction) {
      throw new Error("GEMINI_API_KEY is not configured for production use.");
    }
    console.warn("GEMINI_API_KEY missing, attempting Ollama directly.");
    return await fetchFromOllama(systemPrompt, prompt);
  }

  try {
    const parts: Part[] = [{ text: `${systemPrompt}\n\n${prompt}` }];
    
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

    const requestBody = JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    try {
      const response = await fetchWithFallback(apiKey, requestBody);
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
    } catch (fallbackError) {
      if (isProduction) {
        throw fallbackError;
      }
      console.warn("Gemini Failed, attempting Ollama fallback:", fallbackError);
      return await fetchFromOllama(systemPrompt, prompt);
    }
    
    throw new Error("Invalid response structure from LLM");
  } catch (error) {
    if (isProduction) {
      throw error;
    }
    // If we've already tried Ollama and it failed, or if anything else went wrong
    if (error instanceof Error && error.message.includes("Ollama API")) {
       throw error;
    }
    
    console.warn("AI Generation encountered an issue, trying one last time with Ollama...");
    try {
      return await fetchFromOllama(systemPrompt, prompt);
    } catch (ollamaError) {
      console.error("AI Generation Critical Failure (Gemini & Ollama failed):", error);
      throw error;
    }
  }
}
