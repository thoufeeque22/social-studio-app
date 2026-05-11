import { describe, it, beforeEach, vi, expect, Mock } from 'vitest';
import { POST } from '../../app/api/upload/facebook/route';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { publishFacebookVideo, publishFacebookReel } from '@/lib/platforms/facebook';
import { prisma } from '../../lib/core/prisma';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/platforms/facebook', () => ({
  publishFacebookVideo: vi.fn(),
  publishFacebookReel: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
  },
}));

vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    account: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('fs/promises', () => ({
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn().mockResolvedValue({ size: 1000 }),
  },
}));

interface MockSession {
  user: { id: string };
}

describe('Facebook Long-form vs Reel Branching', () => {
  const mockedAuth = auth as Mock;
  const mockedPublishVideo = publishFacebookVideo as Mock;
  const mockedPublishReel = publishFacebookReel as Mock;
  const mockedAccountFindFirst = prisma.account.findFirst as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.mockResolvedValue({ user: { id: 'u1' } } as MockSession);
    mockedPublishVideo.mockResolvedValue({ success: true, platformPostId: 'p1' });
    mockedPublishReel.mockResolvedValue({ success: true, platformPostId: 'p2' });
    mockedAccountFindFirst.mockResolvedValue({ id: 'acc1', userId: 'u1', platform: 'facebook' });
  });

  const createMockRequest = (body: Record<string, unknown>) => {
    return {
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => body,
    } as unknown as NextRequest;
  };

  it('calls publishFacebookReel when videoFormat is "short"', async () => {
    await POST(createMockRequest({
      stagedFileId: 'test.mp4',
      videoFormat: 'short',
      accountId: 'acc1',
      description: 'Test Reel'
    }));

    expect(publishFacebookReel).toHaveBeenCalled();
    expect(publishFacebookVideo).not.toHaveBeenCalled();
  });

  it('calls publishFacebookVideo when videoFormat is "long"', async () => {
    await POST(createMockRequest({
      stagedFileId: 'test.mp4',
      videoFormat: 'long',
      accountId: 'acc1',
      title: 'Test Long Video'
    }));

    expect(publishFacebookVideo).toHaveBeenCalled();
    expect(publishFacebookReel).not.toHaveBeenCalled();
  });

  it('defaults to publishFacebookReel when videoFormat is missing', async () => {
    await POST(createMockRequest({
      stagedFileId: 'test.mp4',
      accountId: 'acc1'
    }));

    expect(publishFacebookReel).toHaveBeenCalled();
  });
});

