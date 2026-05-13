import { describe, it, expect, vi, Mock } from 'vitest';
import { rankThumbnails } from '@/lib/core/ai';
import { generateObject } from 'ai';

vi.mock('ai', () => ({
  generateObject: vi.fn()
}));

describe('AI Thumbnail Ranking', () => {
  it('should return the best frame index and reason', async () => {
    const mockResponse = {
      object: {
        bestFrameIndex: 1,
        reason: 'Best contrast and clear facial expression.'
      }
    };

    (generateObject as Mock).mockResolvedValue(mockResponse);

    const frames = [
      'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
    ];

    const result = await rankThumbnails(frames);

    expect(result.bestFrameIndex).toBe(1);
    expect(result.reason).toBe('Best contrast and clear facial expression.');
    expect(generateObject).toHaveBeenCalled();
  });
});
