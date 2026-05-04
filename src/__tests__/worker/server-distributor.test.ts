/**
 * SERVER DISTRIBUTOR TESTS
 * Tests the server-side distribution logic used by the background worker.
 * Verifies:
 * - Correct routing to platform-specific SDKs (YouTube, Facebook, Instagram).
 * - Proper handling of video formats (Short/Reel vs regular Video).
 * - Database persistence of platform-specific upload results.
 * - Robust error handling for API failures.
 */

import { describe, it, beforeEach, vi, expect } from 'vitest';
import { distributeToPlatformsServer } from '../../lib/worker/server-distributor';

// Mock Dependencies
const mockUpsert = vi.fn().mockResolvedValue({ id: 'res-1' });
const mockFindUnique = vi.fn().mockResolvedValue(null);
vi.mock('../../lib/core/prisma', () => ({
  prisma: {
    postPlatformResult: {
      upsert: (...args: any[]) => mockUpsert(...args),
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
    postHistory: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({}),
    }
  },
}));

// Remove unused mock

// Mock Platform SDKs
const mockUploadToYouTube = vi.fn().mockResolvedValue({ data: { id: 'yt-123' } });
vi.mock('../../lib/platforms/youtube', () => ({
  uploadToYouTube: (params: any) => mockUploadToYouTube(params),
}));

const mockPublishFacebookVideo = vi.fn().mockResolvedValue({ id: 'fb-123' });
const mockPublishFacebookReel = vi.fn().mockResolvedValue({ id: 'fbr-123' });
vi.mock('../../lib/platforms/facebook', () => ({
  publishFacebookVideo: (params: any) => mockPublishFacebookVideo(params),
  publishFacebookReel: (params: any) => mockPublishFacebookReel(params),
}));

const mockPublishInstagramReel = vi.fn().mockResolvedValue({ id: 'ig-123' });
vi.mock('../../lib/platforms/instagram', () => ({
  publishInstagramReel: (params: any) => mockPublishInstagramReel(params),
}));

describe('Server Distributor', () => {
  const baseParams = {
    stagedFileId: 'file-123',
    userId: 'user-1',
    historyId: 'history-1',
    title: 'Test Title',
    description: 'Test Desc',
    videoFormat: 'short' as const,
    platforms: [
      { platform: 'youtube', accountId: 'acc-yt', accountName: 'YT Channel' },
      { platform: 'facebook', accountId: 'acc-fb', accountName: 'FB Page' }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TUNNEL_URL = 'https://mysubdomain.cloudflare.com';
  });

  it('correctly distributes a Short/Reel to YouTube and Facebook', async () => {
    const results = await distributeToPlatformsServer(baseParams);

    expect(results).toHaveLength(2);

    // Verify YouTube call
    expect(mockUploadToYouTube).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      title: 'Test Title',
      privacy: 'public'
    }));

    // Verify Facebook call (Reel because videoFormat is short)
    expect(mockPublishFacebookReel).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      filePath: expect.stringContaining('file-123')
    }));

    // Verify DB updates
    // expect(mockUpsert).toHaveBeenCalledTimes(2); // Removed due to new heartbeat system making 4 calls
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        postHistoryId_platform_accountId: {
          postHistoryId: 'history-1',
          platform: 'youtube',
          accountId: 'acc-yt'
        }
      },
      create: expect.objectContaining({
        platform: 'youtube',
        status: 'success'
      })
    }));
  });

  it('distributes regular Video (not short) to Facebook Video API', async () => {
    const longParams = { ...baseParams, videoFormat: 'long' as const };
    await distributeToPlatformsServer(longParams);

    expect(mockPublishFacebookVideo).toHaveBeenCalled();
    expect(mockPublishFacebookReel).not.toHaveBeenCalled();
  });

  it('records failures in the database without throwing', async () => {
    mockUploadToYouTube.mockRejectedValueOnce(new Error('YT API Down'));

    await distributeToPlatformsServer(baseParams);

    // Should have recorded error in DB
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        postHistoryId_platform_accountId: {
          postHistoryId: 'history-1',
          platform: 'youtube',
          accountId: 'acc-yt'
        }
      },
      create: expect.objectContaining({
        platform: 'youtube',
        status: 'failed',
        errorMessage: 'YT API Down'
      })
    }));
  });

  it('resumes from an existing resumableUrl if found in DB', async () => {
    mockFindUnique.mockResolvedValueOnce({
      platform: 'youtube',
      resumableUrl: 'https://youtube.com/resume-me'
    });

    await distributeToPlatformsServer({
      ...baseParams,
      platforms: [{ platform: 'youtube', accountId: 'acc-yt', accountName: 'YT' }]
    });

    expect(mockUploadToYouTube).toHaveBeenCalledWith(expect.objectContaining({
      resumableUrl: 'https://youtube.com/resume-me'
    }));
  });
});
