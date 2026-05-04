import { describe, it, beforeEach, vi, expect } from 'vitest';
import { getMultiPlatformAIPreviews } from '../../app/actions/ai';
import { generatePostContent } from '../../lib/utils/ai-writer';
import { protectedAction } from '../../lib/core/action-utils';

vi.mock('../../lib/utils/ai-writer', () => ({
  generatePostContent: vi.fn(),
}));

vi.mock('../../lib/core/action-utils', () => ({
  protectedAction: vi.fn((cb) => cb('user-1')),
}));

describe('getMultiPlatformAIPreviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws an error if tier is Manual', async () => {
    await expect(getMultiPlatformAIPreviews('Title', 'Desc', 'Manual', 'Smart', ['youtube']))
      .rejects.toThrow('Cannot generate previews in Manual mode.');
  });

  it('generates previews for multiple platforms', async () => {
    const mockResult = { title: 'AI Title', description: 'AI Desc', hashtags: ['#test'] };
    vi.mocked(generatePostContent).mockResolvedValue(mockResult);

    const result = await getMultiPlatformAIPreviews(
      'My Video',
      'Original Desc',
      'Premium',
      'SEO',
      ['youtube', 'tiktok'],
      undefined,
      'My Custom Vibe'
    );

    expect(result).toEqual({
      youtube: mockResult,
      tiktok: mockResult,
    });
    expect(generatePostContent).toHaveBeenCalledTimes(2);
  });

  it('handles partial failures gracefully', async () => {
    vi.mocked(generatePostContent)
      .mockResolvedValueOnce({ title: 'YT Title', description: 'YT Desc', hashtags: [] })
      .mockRejectedValueOnce(new Error('AI Busy'));

    const result = await getMultiPlatformAIPreviews(
      'My Video',
      '',
      'Basic',
      'Smart',
      ['youtube', 'instagram'],
      undefined,
      undefined
    );

    expect(result.youtube.title).toBe('YT Title');
    expect(result.instagram.description).toContain('AI Error: AI Busy');
    expect(result.instagram.title).toBe('My Video'); // Fallback title
  });

  it('passes customStyleText to generatePostContent', async () => {
    const mockResult = { title: 'Custom', description: 'Desc', hashtags: [] };
    vi.mocked(generatePostContent).mockResolvedValue(mockResult);

    const customVibe = "Sassy and Puns";
    await getMultiPlatformAIPreviews(
      'Title',
      'Desc',
      'Generate',
      'Custom',
      ['youtube'],
      undefined,
      customVibe
    );

    expect(generatePostContent).toHaveBeenCalledWith(
      'Generate',
      'Custom',
      'Title',
      'Desc',
      'youtube',
      undefined,
      customVibe
    );
  });
});
