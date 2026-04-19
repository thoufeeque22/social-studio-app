import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserAccounts, toggleAccountDistribution } from '../../app/actions/user';
import { prisma } from '../../lib/prisma';
import { auth } from '@/auth';

// 1. Mock Auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// 2. Mock Prisma
vi.mock('../../lib/prisma', () => ({
  prisma: {
    account: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
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
});
