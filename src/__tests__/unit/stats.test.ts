/**
 * DASHBOARD STATS TESTS
 * Tests the getDashboardStats server action.
 * Verifies:
 * - Aggregation of metrics (views, reach, followers) across different platforms.
 * - Correct formatting of large numbers (e.g., 1.5K).
 * - Graceful handling of individual platform API failures.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardStats } from '../../app/actions/stats';
import { prisma } from '../../lib/core/prisma';
import { auth } from '@/auth';
import * as youtube from '@/lib/platforms/youtube';
import * as instagram from '@/lib/platforms/instagram';
import type { Session } from 'next-auth';
import { Account as PrismaAccount } from '@prisma/client';

// Mocks
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('../../lib/core/prisma', () => ({
  prisma: {
    postHistory: { count: vi.fn() },
    account: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/platforms/youtube', () => ({
  getYouTubeStats: vi.fn(),
}));

vi.mock('@/lib/platforms/instagram', () => ({
  getInstagramStats: vi.fn(),
}));

describe('Stats Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('calculates aggregate stats across multiple platforms', async () => {
    vi.mocked(auth as unknown as () => Promise<Session | null>).mockResolvedValue({ user: { id: 'u1' } } as unknown as Session);
    vi.mocked(prisma.postHistory.count).mockResolvedValue(5);
    vi.mocked(prisma.account.findMany).mockResolvedValue([
      { 
        id: 'a1', 
        provider: 'google', 
        accountName: 'YT', 
        isDistributionEnabled: true,
        userId: 'u1',
        type: 'oauth',
        providerAccountId: 'pa1',
        expires_at: null,
        refresh_token: null,
        access_token: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null
      },
      { 
        id: 'a2', 
        provider: 'facebook', 
        accountName: 'IG', 
        isDistributionEnabled: true,
        userId: 'u1',
        type: 'oauth',
        providerAccountId: 'pa2',
        expires_at: null,
        refresh_token: null,
        access_token: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null
      },
    ] as unknown as PrismaAccount[]);

    vi.mocked(youtube.getYouTubeStats).mockResolvedValue({ views: 1000, subscribers: 50, videos: 5 });
    vi.mocked(instagram.getInstagramStats).mockResolvedValue({ reach: 500, followers: 10, media: 10, name: 'Test IG' });

    const stats = await getDashboardStats();

    // Total Posts
    expect(stats[0].value).toBe('5');
    
    // Total Reach (1000 + 500 = 1500 -> 1.5K)
    expect(stats[1].value).toBe('1.5K');
    
    // Community (50 + 10 = 60)
    expect(stats[2].value).toBe('60'); 
  });

  it('gracefully handles platform failures', async () => {
    vi.mocked(auth as unknown as () => Promise<Session | null>).mockResolvedValue({ user: { id: 'u1' } } as unknown as Session);
    vi.mocked(prisma.postHistory.count).mockResolvedValue(1);
    vi.mocked(prisma.account.findMany).mockResolvedValue([
      { 
        id: 'a1', 
        provider: 'google', 
        accountName: 'YT', 
        isDistributionEnabled: true,
        userId: 'u1',
        type: 'oauth',
        providerAccountId: 'pa1',
        expires_at: null,
        refresh_token: null,
        access_token: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null
      }
    ] as unknown as PrismaAccount[]);
    
    vi.mocked(youtube.getYouTubeStats).mockRejectedValue(new Error('API Down'));

    const stats = await getDashboardStats();
    
    // Should still return default/zero stats for failed platforms
    expect(stats[1].value).toBe('0');
  });
});
