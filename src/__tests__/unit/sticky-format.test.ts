/**
 * STICKY FORMAT TESTS
 * Verifies the persistence of user-selected video formats (Short vs Long).
 * Ensures that once a user selects a format, it remains consistent across sessions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getVideoFormatPreference, updateVideoFormatPreference } from '../../app/actions/user';
import { prisma } from '../../lib/core/prisma';
import { auth } from '@/auth';

// 1. Mock Auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// 2. Mock Prisma
vi.mock('../../lib/core/prisma', () => ({
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

describe('Sticky Video Format Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVideoFormatPreference', () => {
    it('returns default "short" if no session exists', async () => {
      vi.mocked(auth).mockResolvedValue(null as never);
      const result = await getVideoFormatPreference();
      expect(result).toBe('short');
    });

    it('returns preferred format from DB', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ preferredVideoFormat: 'long' } as never);
      
      const result = await getVideoFormatPreference();
      expect(result).toBe('long');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        select: { preferredVideoFormat: true }
      });
    });
  });

  describe('updateVideoFormatPreference', () => {
    it('throws an error if no session exists', async () => {
      vi.mocked(auth).mockResolvedValue(null as never);
      await expect(updateVideoFormatPreference('long'))
        .rejects.toThrow('Unauthorized');
    });

    it('updates user preferences in DB', async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: 'user_1' } } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      
      const result = await updateVideoFormatPreference('long');
      
      expect(result).toEqual({ success: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { preferredVideoFormat: 'long' }
      });
    });
  });
});
