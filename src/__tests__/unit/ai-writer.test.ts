/**
 * AI VIBE-WRITER TESTS
 * Tests the generatePostContent utility which interfaces with the Gemini API.
 * Verifies:
 * - Correct handling of successful LLM responses and JSON parsing.
 * - Robust error handling for malformed JSON or empty responses.
 * - Proper environment variable checks (API key availability).
 */

import { describe, it, beforeEach, vi, expect } from 'vitest';
import { generatePostContent } from '../../lib/utils/ai-writer';

describe('AI Vibe-Writer (generatePostContent)', () => {
  beforeEach(() => {
    // Reset env vars before each test to strict modes
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GEMINI_API_KEY', 'test_fake_api_key');
    
    // Clear mocks
    vi.resetAllMocks();
    
    // Silence expected console errors/warns to keep test output clean
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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

  it('should successfully return parsed content when LLM returns valid JSON', async () => {
    const mockOutput = {
      title: "Viral Title",
      description: "Amazing description",
      hashtags: ["#viral", "#test"]
    };
    
    const mockResponse = {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(mockOutput) }] } }]
      })
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse as any);

    const result = await generatePostContent('SEO', 'Input Title', 'Input Context', 'youtube');
    
    expect(result).toEqual(mockOutput);
    expect(global.fetch).toHaveBeenCalled();
  });
});

