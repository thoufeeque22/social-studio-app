import { describe, it, beforeEach, vi, expect } from 'vitest';
import { generatePostContent } from '../../lib/utils/ai-writer';

describe('AI Vibe-Writer (generatePostContent)', () => {
  beforeEach(() => {
    // Reset env vars before each test to strict modes
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GEMINI_API_KEY', 'test_fake_api_key');
    
    // Clear mocks
    vi.resetAllMocks();
  });

  it('should fall back safely if GEMINI returns an empty string', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "" }] } }]
      })
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse as any);

    await expect(generatePostContent('SEO', 'Raw Text', 'Context', 'youtube'))
      .rejects.toThrow('Invalid response structure from LLM');
  });

  it('should fall back safely on malformed JSON from GEMINI', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "{ malformed: JSON" }] } }]
      })
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse as any);

    await expect(generatePostContent('Gen-Z', 'Raw', 'Ctx', 'tiktok'))
      .rejects.toThrow();
  });

  it('should throw Error if GEMINI_API_KEY is missing in production', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');

    await expect(generatePostContent('Hook', 'Hello', 'World', 'instagram'))
      .rejects.toThrow('GEMINI_API_KEY is not configured for production use.');
  });

  it('should throw Error if GEMINI_API_KEY is missing in development', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');

    await expect(generatePostContent('Hook', 'Hello', 'World', 'instagram'))
      .rejects.toThrow('GEMINI_API_KEY is not configured for production use.');
  });
});
