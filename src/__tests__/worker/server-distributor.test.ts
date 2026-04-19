import { describe, it, beforeEach, vi, expect } from 'vitest';
import { distributeToPlatformsServer } from '../../lib/server-distributor';
import { upsertPlatformResultInternal } from '../../app/actions/history';

// Mock Dependencies
vi.mock('../../lib/prisma', () => ({
  prisma: {},
}));

vi.mock('../../app/actions/history', () => ({
  upsertPlatformResultInternal: vi.fn().mockResolvedValue({ id: 'res-1' }),
}));

// Mock Platform SDKs
const mockUploadToYouTube = vi.fn().mockResolvedValue({ id: 'yt-123' });
vi.mock('../../lib/youtube', () => ({
  uploadToYouTube: (params: any) => mockUploadToYouTube(params),
}));

const mockPublishFacebookVideo = vi.fn().mockResolvedValue({ id: 'fb-123' });
const mockPublishFacebookReel = vi.fn().mockResolvedValue({ id: 'fbr-123' });
vi.mock('../../lib/facebook', () => ({
  publishFacebookVideo: (params: any) => mockPublishFacebookVideo(params),
  publishFacebookReel: (params: any) => mockPublishFacebookReel(params),
}));

const mockPublishInstagramReel = vi.fn().mockResolvedValue({ id: 'ig-123' });
vi.mock('../../lib/instagram', () => ({
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
      videoUrl: expect.stringContaining('mysubdomain.cloudflare.com/api/media/file-123')
    }));

    // Verify DB updates
    expect(upsertPlatformResultInternal).toHaveBeenCalledTimes(2);
    expect(upsertPlatformResultInternal).toHaveBeenCalledWith('user-1', 'history-1', expect.objectContaining({
      platform: 'youtube',
      status: 'success'
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
    expect(upsertPlatformResultInternal).toHaveBeenCalledWith('user-1', 'history-1', expect.objectContaining({
      platform: 'youtube',
      status: 'failed',
      errorMessage: 'YT API Down'
    }));
  });
});
