import { describe, it, beforeEach, vi, expect } from 'vitest';
import { POST } from '../app/api/upload/facebook/route';
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

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

describe('Facebook Long-form vs Reel Branching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(publishFacebookVideo).mockResolvedValue({ success: true } as any);
    vi.mocked(publishFacebookReel).mockResolvedValue({ success: true } as any);
  });

  const createMockRequest = (formData: FormData) => {
    return {
      formData: async () => formData,
    } as unknown as NextRequest;
  };

  it('calls publishFacebookReel when videoFormat is "short"', async () => {
    const formData = new FormData();
    formData.append('file', new File(['video content'], 'short.mp4', { type: 'video/mp4' }));
    formData.append('videoFormat', 'short');
    formData.append('accountId', 'acc1');

    await POST(createMockRequest(formData));

    expect(publishFacebookReel).toHaveBeenCalled();
    expect(publishFacebookVideo).not.toHaveBeenCalled();
  });

  it('calls publishFacebookVideo when videoFormat is "long"', async () => {
    const formData = new FormData();
    formData.append('file', new File(['video content'], 'long.mp4', { type: 'video/mp4' }));
    formData.append('videoFormat', 'long');
    formData.append('accountId', 'acc1');

    await POST(createMockRequest(formData));

    expect(publishFacebookVideo).toHaveBeenCalled();
    expect(publishFacebookReel).not.toHaveBeenCalled();
  });

  it('defaults to publishFacebookReel when videoFormat is missing', async () => {
    const formData = new FormData();
    formData.append('file', new File(['video content'], 'default.mp4', { type: 'video/mp4' }));
    formData.append('accountId', 'acc1');

    await POST(createMockRequest(formData));

    expect(publishFacebookReel).toHaveBeenCalled();
  });
});
