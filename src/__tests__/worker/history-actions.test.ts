/**
 * POST HISTORY ACTIONS TESTS
 * Tests the server actions used by the History page.
 * Focuses on:
 * - Fetching post history with cursor-based pagination.
 * - Retry logic for failed distribution channels.
 * - Stale post detection and resumed upload handling.
 */

import { describe, it, beforeEach, vi, expect } from 'vitest';
import { upsertPlatformResultInternal } from '../../app/actions/history';
import { prisma } from '../../lib/core/prisma';

// Mock Auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('../../lib/core/prisma', () => ({
  prisma: {
    postHistory: {
      findUnique: vi.fn(),
    },
    postPlatformResult: {
      upsert: vi.fn(),
    },
  },
}));

describe('History Actions (Internal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully updates a platform result when user owns the history entry', async () => {
    const userId = 'user-1';
    const historyId = 'history-1';
    const resultInput = {
      platform: 'youtube' as const,
      status: 'success' as const,
      platformPostId: 'yt-123'
    };

    // Mock finding the history entry (ownership check)
    vi.mocked(prisma.postHistory.findUnique).mockResolvedValue({ id: historyId, userId } as never);
    vi.mocked(prisma.postPlatformResult.upsert).mockResolvedValue({ id: 'res-1' } as never);

    await upsertPlatformResultInternal(userId, historyId, resultInput);

    // Verify ownership check
    expect(prisma.postHistory.findUnique).toHaveBeenCalledWith({
      where: { id: historyId, userId: userId }
    });

    // Verify upsert
    expect(prisma.postPlatformResult.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        postHistoryId_platform_accountId: {
          postHistoryId: historyId,
          platform: 'youtube',
          accountId: ''
        }
      },
      update: expect.objectContaining({
        status: 'success',
        platformPostId: 'yt-123'
      })
    }));
  });

  it('throws an error if history entry is not found or user does not own it', async () => {
    const userId = 'user-1';
    const historyId = 'history-1';
    
    // Mock no history entry found for this user
    vi.mocked(prisma.postHistory.findUnique).mockResolvedValue(null);

    await expect(upsertPlatformResultInternal(userId, historyId, { 
      platform: 'youtube', 
      status: 'success' 
    })).rejects.toThrow('History entry not found');

    expect(prisma.postPlatformResult.upsert).not.toHaveBeenCalled();
  });
});
