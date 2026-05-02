/**
 * AI VIBE-WRITER TESTS
 * Tests the generatePostContent utility which interfaces with the Gemini API.
 */

import { describe, it, beforeEach, vi, expect } from 'vitest';
import { generatePostContent } from '../../lib/utils/ai-writer';

describe('AI Vibe-Writer (generatePostContent)', () => {
  beforeEach(() => {
    // Reset env vars before each test to strict modes
    vi.stubEnv('NODE_ENV', 'development');
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

    await expect(generatePostContent('Generate', 'SEO', 'Raw Text', 'Context', 'youtube'))
      .rejects.toThrow('Invalid response structure from LLM');
  });

  it('should attempt Ollama if GEMINI_API_KEY is missing in development', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');
    
    const mockOllamaOutput = {
      title: "Ollama Title",
      description: "Ollama Description",
      hashtags: ["#ollama"]
    };

    const mockResponse = {
      ok: true,
      json: async () => ({
        response: JSON.stringify(mockOllamaOutput)
      })
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse as any);

    const result = await generatePostContent('Generate', 'Hook', 'Hello', 'World', 'instagram');
    
    expect(result.title).toBe("Ollama Title");
    expect(global.fetch).toHaveBeenCalled();
    const fetchUrl = (global.fetch as any).mock.calls[0][0];
    expect(fetchUrl).toContain(':11434/api/generate');
  });

  it('should THROW if GEMINI_API_KEY is missing in production (no Ollama)', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'production');

    await expect(generatePostContent('Generate', 'Hook', 'Hello', 'World', 'instagram'))
      .rejects.toThrow('GEMINI_API_KEY is not configured for production use.');
  });

  it('should successfully return parsed content when Gemini returns valid JSON', async () => {
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

    const result = await generatePostContent('Generate', 'SEO', 'Input Title', 'Input Context', 'youtube');
    
    expect(result).toEqual(mockOutput);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should fallback to Ollama if all Gemini models fail in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const mockOllamaOutput = { title: "Ollama Fallback", description: "Gemini Failed", hashtags: [] };
    
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 } as any) // gemini fallback 1
      .mockResolvedValueOnce({ ok: false, status: 500 } as any) // gemini fallback 2
      .mockResolvedValueOnce({ ok: false, status: 500 } as any) // gemini fallback 3
      .mockResolvedValueOnce({ ok: false, status: 500 } as any) // gemini fallback 4
      .mockResolvedValueOnce({ ok: false, status: 500 } as any) // gemini fallback 5
      .mockResolvedValueOnce({ ok: false, status: 500 } as any) // gemini fallback 6
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: JSON.stringify(mockOllamaOutput)
        })
      } as any);

    const result = await generatePostContent('Generate', 'SEO', 'Input Title', 'Input Context', 'youtube');
    
    expect(result.title).toBe("Ollama Fallback");
    expect(global.fetch).toHaveBeenCalledTimes(7);
  });

  it('should THROW and NOT attempt Ollama if Gemini fails in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 } as any);

    await expect(generatePostContent('Generate', 'SEO', 'Input Title', 'Input Context', 'youtube'))
      .rejects.toThrow('LLM API returned 500 for model');
    
    // Should have tried gemini models but not ollama (ollama uses :11434)
    const calls = (global.fetch as any).mock.calls;
    calls.forEach((call: any) => {
      expect(call[0]).not.toContain(':11434');
    });
  });

  describe('Cultural Intelligence & Custom Styles', () => {
    it('Smart Mode: should use SEO strategy for YouTube', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ title: "YT", description: "Desc", hashtags: [] }) }] } }]
        })
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse as any);

      await generatePostContent('Generate', 'Smart', 'Title', 'Context', 'youtube');
      
      const fetchBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      const prompt = fetchBody.contents[0].parts[0].text;
      
      expect(prompt).toContain('DISCOVERABILITY');
      expect(prompt).toContain('SEARCH engine');
    });

    it('Smart Mode: should use Gen-Z strategy for TikTok', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ title: "TT", description: "Desc", hashtags: [] }) }] } }]
        })
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse as any);

      await generatePostContent('Generate', 'Smart', 'Title', 'Context', 'tiktok');
      
      const fetchBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      const prompt = fetchBody.contents[0].parts[0].text;
      
      expect(prompt).toContain('ADRENALINE & AUTHENTICITY');
      expect(prompt).toContain('ATTENTION engine');
    });

    it('Custom Mode: should inject user-defined style text', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ title: "Custom", description: "Desc", hashtags: [] }) }] } }]
        })
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse as any);

      const customVibe = "Like a 1950s Detective";
      await generatePostContent('Generate', 'Custom', 'Title', 'Context', 'instagram', undefined, customVibe);
      
      const fetchBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      const prompt = fetchBody.contents[0].parts[0].text;
      
      expect(prompt).toContain('USER-DEFINED');
      expect(prompt).toContain(customVibe);
    });
  });
});
