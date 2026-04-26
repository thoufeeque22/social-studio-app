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
  });

  it('calculates aggregate stats across multiple platforms', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.postHistory.count).mockResolvedValue(5);
    vi.mocked(prisma.account.findMany).mockResolvedValue([
      { id: 'a1', provider: 'google' },
      { id: 'a2', provider: 'facebook' },
    ] as any);

    vi.mocked(youtube.getYouTubeStats).mockResolvedValue({ views: 1000, subscribers: 50 });
    vi.mocked(instagram.getInstagramStats).mockResolvedValue({ reach: 500, followers: 10 });

    const stats = await getDashboardStats();

    // Total Posts
    expect(stats[0].value).toBe('5');
    
    // Total Reach (1000 + 500 = 1500 -> 1.5K)
    expect(stats[1].value).toBe('1.5K');
    
    // Community (50 + 10 = 60)
    expect(stats[2].value).toBe('60'); 
    // Wait, let's check formatNumber again. 
    // if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    // else return num.toString();
    // So 60 should be "60"
  });

  it('gracefully handles platform failures', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as any);
    vi.mocked(prisma.postHistory.count).mockResolvedValue(1);
    vi.mocked(prisma.account.findMany).mockResolvedValue([{ id: 'a1', provider: 'google' }] as any);
    
    vi.mocked(youtube.getYouTubeStats).mockRejectedValue(new Error('API Down'));

    const stats = await getDashboardStats();
    
    // Should still return default/zero stats for failed platforms
    expect(stats[1].value).toBe('0');
  });
});
