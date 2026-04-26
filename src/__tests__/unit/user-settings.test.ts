/**
 * USER SETTINGS SERVER ACTION TESTS
 * Tests the server actions related to user configuration and account management.
 * Covers:
 * - Account fetching and distribution toggling.
 * - Platform preferences (enabled/disabled platforms).
 * - Sticky UI settings (video format and AI style persistence).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getUserAccounts, 
  toggleAccountDistribution,
  getPlatformPreferences,
  togglePlatformPreference,
  getVideoFormatPreference,
  updateVideoFormatPreference,
  getAIStylePreference,
  updateAIStylePreference
} from '../../app/actions/user';
import { prisma } from '../../lib/core/prisma';
import { auth } from '@/auth';

// 1. Mock Auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// 2. Mock Prisma
vi.mock('../../lib/core/prisma', () => ({
  prisma: {
    account: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    platformPreference: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    }
  },
}));

// 3. Mock Next/Cache for revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('User Account Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserAccounts', () => {
    it('returns an empty array if no session exists', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const result = await getUserAccounts();
      expect(result).toEqual([]);
    });

    it('returns accounts if they exist in DB', async () => {
      const mockAccounts = [
        { id: 'acc_1', provider: 'google', accountName: 'Channel A', isDistributionEnabled: true },
        { id: 'acc_2', provider: 'tiktok', accountName: 'Profile B', isDistributionEnabled: false },
      ];
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any);
      vi.mocked(prisma.account.findMany).mockResolvedValue(mockAccounts as any);
      
      const result = await getUserAccounts();
      expect(result).toEqual(mockAccounts);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        select: {
          id: true,
          provider: true,
          accountName: true,
          isDistributionEnabled: true,
        }
      });
    });
  });

  describe('toggleAccountDistribution', () => {
    it('throws an error if no session exists', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      await expect(toggleAccountDistribution('acc_1', true))
        .rejects.toThrow('Unauthorized');
    });

    it('updates the account distribution status in DB', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any);
      vi.mocked(prisma.account.update).mockResolvedValue({} as any);
      
      const result = await toggleAccountDistribution('acc_1', false);
      
      expect(result).toEqual({ success: true });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { 
          id: 'acc_1',
          userId: 'user_1'
        },
        data: {
          isDistributionEnabled: false
        }
      });
    });
  });

  describe('Platform & Sticky Preferences', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any);
    });

    it('fetches platform preferences', async () => {
      const mockPrefs = [{ platformId: 'yt', isEnabled: true }];
      vi.mocked(prisma.platformPreference.findMany).mockResolvedValue(mockPrefs as any);
      
      const result = await getPlatformPreferences();
      expect(result).toEqual(mockPrefs);
    });

    it('upserts platform preference', async () => {
      vi.mocked(prisma.platformPreference.upsert).mockResolvedValue({} as any);
      await togglePlatformPreference('tiktok', true);
      
      expect(prisma.platformPreference.upsert).toHaveBeenCalledWith({
        where: { userId_platformId: { userId: 'user_1', platformId: 'tiktok' } },
        update: { isEnabled: true },
        create: { userId: 'user_1', platformId: 'tiktok', isEnabled: true }
      });
    });

    it('manages video format preference', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ preferredVideoFormat: 'long' } as any);
      const format = await getVideoFormatPreference();
      expect(format).toBe('long');

      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      await updateVideoFormatPreference('short');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { preferredVideoFormat: 'short' }
      });
    });

    it('manages AI style preference', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ preferredAIStyle: 'Enrich' } as any);
      const style = await getAIStylePreference();
      expect(style).toBe('Enrich');

      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      await updateAIStylePreference('Generate');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { preferredAIStyle: 'Generate' }
      });
    });
  });
});
