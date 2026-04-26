/**
 * TIKTOK PLATFORM TESTS
 * Unit tests for the TikTok publishing logic.
 * Focuses on:
 * - Proper initialization with the TikTok Open API.
 * - Accurate construction of binary upload payloads and headers.
 * - Handling of TikTok-specific error codes (e.g., rate limits).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publishTikTokVideo } from '@/lib/platforms/tiktok';
import { prisma } from '@/lib/core/prisma';
import fs from 'fs';

// Mock Prisma
vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    account: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Mock FS
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn().mockResolvedValue(Buffer.from('video_data')),
  },
  default: {
    promises: {
      readFile: vi.fn().mockResolvedValue(Buffer.from('video_data')),
    }
  }
}));

global.fetch = vi.fn();

describe('TikTok Platform Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly initializes and uploads a video to TikTok', async () => {
    // 1. Mock DB Account
    vi.mocked(prisma.account.findUnique).mockResolvedValue({
      id: 'acc1',
      access_token: 'tk_token_123',
    } as any);

    // 2. Mock TikTok API Init
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { upload_url: 'https://tiktok.com/upload/binary' },
        error: { code: 'ok' }
      }),
    } as any);

    // 3. Mock TikTok Binary Upload
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
    } as any);

    const result = await publishTikTokVideo({
      userId: 'user1',
      videoPath: 'test.mp4',
      title: 'TikTok Viral',
      accountId: 'acc1'
    });

    expect(result.upload_url).toBe('https://tiktok.com/upload/binary');
    
    // Verify initialization payload
    const initCall = vi.mocked(global.fetch).mock.calls[0];
    const payload = JSON.parse(initCall[1]?.body as string);
    expect(payload.post_info.title).toBe('TikTok Viral');
    expect(payload.source_info.source).toBe('FILE_UPLOAD');

    // Verify binary upload headers
    const uploadCall = vi.mocked(global.fetch).mock.calls[1];
    expect(uploadCall[0]).toBe('https://tiktok.com/upload/binary');
    expect(uploadCall[1]?.method).toBe('PUT');
    expect(uploadCall[1]?.headers).toHaveProperty('Content-Range');
  });

  it('throws error if TikTok init fails', async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue({ access_token: 'abc' } as any);
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        error: { code: 'failed', message: 'Rate limit' }
      }),
    } as any);

    await expect(publishTikTokVideo({ userId: 'u1', videoPath: 'v.mp4', title: 'T', accountId: 'a1' }))
      .rejects.toThrow('TikTok Publish Failed: Rate limit');
  });
});
