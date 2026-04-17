import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserPlatforms, updateUserPlatforms } from '../app/actions/user';
import { prisma } from '../lib/prisma';
import { auth } from '@/auth';

// 1. Mock Auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// 2. Mock Prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// 3. Mock Next/Cache for revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('User Settings Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserPlatforms', () => {
    it('returns an empty array if no session exists', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      const result = await getUserPlatforms();
      expect(result).toEqual([]);
    });

    it('returns an empty array if user has no platforms set', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ enabledPlatforms: null } as any);
      
      const result = await getUserPlatforms();
      expect(result).toEqual([]);
    });

    it('returns parsed platforms if they exist in DB', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ 
        enabledPlatforms: JSON.stringify(['youtube', 'tiktok']) 
      } as any);
      
      const result = await getUserPlatforms();
      expect(result).toEqual(['youtube', 'tiktok']);
    });
  });

  describe('updateUserPlatforms', () => {
    it('throws an error if no session exists', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      await expect(updateUserPlatforms(['youtube']))
        .rejects.toThrow('Unauthorized');
    });

    it('updates the database with stringified platforms', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      
      const result = await updateUserPlatforms(['instagram', 'facebook']);
      
      expect(result).toEqual({ success: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: {
          enabledPlatforms: JSON.stringify(['instagram', 'facebook'])
        }
      });
    });
  });
});
