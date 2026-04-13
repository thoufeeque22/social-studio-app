import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { generatePostContent, StyleMode } from '../lib/ai-writer';

describe('AI Vibe-Writer (generatePostContent)', () => {
  beforeEach(() => {
    // Reset env vars before each test to strict modes
    process.env.NODE_ENV = 'production';
    process.env.GEMINI_API_KEY = 'test_fake_api_key';
  });

  it('should fall back safely if GEMINI returns an empty string', async () => {
    // Mock the global fetch
    const mockResponse = {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "" }] } }]
      })
    };
    const mockFetch = mock.fn(async () => mockResponse as any);
    (global as any).fetch = mockFetch;

    await assert.rejects(
      async () => {
        await generatePostContent('SEO', 'Raw Text', 'Context', 'youtube');
      },
      (err: Error) => {
        assert.strictEqual(err.message, 'Invalid response structure from LLM');
        return true;
      }
    );
  });

  it('should fall back safely on malformed JSON from GEMINI', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "{ malformed: JSON" }] } }]
      })
    };
    const mockFetch = mock.fn(async () => mockResponse as any);
    (global as any).fetch = mockFetch;

    await assert.rejects(
      async () => {
        await generatePostContent('Gen-Z', 'Raw', 'Ctx', 'tiktok');
      },
      (err: Error) => {
        // Unexpected token m in JSON at position 2
        assert.ok(err instanceof SyntaxError);
        return true;
      }
    );
  });

  it('should throw Error if GEMINI_API_KEY is missing in production', async () => {
    delete process.env.GEMINI_API_KEY;

    await assert.rejects(
      async () => {
        await generatePostContent('Hook', 'Hello', 'World', 'instagram');
      },
      (err: Error) => {
        assert.strictEqual(err.message, 'GEMINI_API_KEY is not configured for production use.');
        return true;
      }
    );
  });

  it('should use fallback mock if GEMINI_API_KEY is missing in development', async () => {
    delete process.env.GEMINI_API_KEY;
    process.env.NODE_ENV = 'development';

    const result = await generatePostContent('Hook', 'Hello', 'World', 'instagram');
    
    assert.strictEqual(result.title, '🔥 Hello');
    assert.strictEqual(result.description, "You won't believe what happens at the end! \uD83E\uDD2F\uD83D\uDC47");
    assert.deepStrictEqual(result.hashtags, ['#viral', '#instagram', '#hook']);
  });
});
