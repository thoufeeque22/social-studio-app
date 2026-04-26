import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePlatformUploadRequest } from '../../lib/core/platform-route-handler';
import { auth } from '@/auth';
import { prisma } from '@/lib/core/prisma';
import { NextRequest } from 'next/server';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    account: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../lib/upload/streaming-parser', () => ({
  streamMultipartFormData: vi.fn().mockResolvedValue({
    filePath: '/tmp/test.mp4',
    fields: { title: 'Test', accountId: 'acc-123' },
    fileName: 'test.mp4'
  }),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
  }
}));

describe('handlePlatformUploadRequest Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('rejects the request if the account does not belong to the user', async () => {
    // Mock prisma to return NULL (account not found for this user)
    (prisma.account.findFirst as any).mockResolvedValue(null);

    const req = {
      headers: { get: () => 'multipart/form-data' },
      json: async () => ({ stagedFileId: 'file-1', accountId: 'acc-target' })
    } as unknown as NextRequest;

    const response = await handlePlatformUploadRequest({
      req,
      platform: 'youtube',
      uploadLogic: async () => ({ success: true })
    });

    const data = await response.json();
    expect(response.status).toBe(403);
    expect(data.error).toContain('Unauthorized: Account not found or not owned by user');
  });

  it('allows the request if the account belongs to the user', async () => {
    // Mock prisma to return the account
    (prisma.account.findFirst as any).mockResolvedValue({ id: 'acc-target', userId: 'user-1' });

    const req = {
      headers: { get: (name: string) => name === 'content-type' ? 'application/json' : null },
      json: async () => ({ stagedFileId: 'file-1', accountId: 'acc-target', fileName: 'test.mp4' })
    } as unknown as NextRequest;

    const response = await handlePlatformUploadRequest({
      req,
      platform: 'youtube',
      uploadLogic: async () => ({ id: 'yt-123' })
    });

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
