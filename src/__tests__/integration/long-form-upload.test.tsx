import { describe, it, beforeEach, vi, expect } from 'vitest';
import { POST } from '../../app/api/upload/facebook/route';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { publishFacebookVideo, publishFacebookReel } from '@/lib/facebook';
import fs from 'fs/promises';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/facebook', () => ({
  publishFacebookVideo: vi.fn(),
  publishFacebookReel: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
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

describe('Facebook Long-form vs Reel Branching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(publishFacebookVideo).mockResolvedValue({ success: true } as any);
    vi.mocked(publishFacebookReel).mockResolvedValue({ success: true } as any);
  });

  const createMockRequest = (body: any) => {
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
