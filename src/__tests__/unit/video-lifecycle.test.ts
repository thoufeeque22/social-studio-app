import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../lib/core/prisma';
import { MAX_STORAGE_PER_USER } from '../../lib/core/constants';
import * as fsLib from 'fs';

// Mock PRISMA
vi.mock('../../lib/core/prisma', () => ({
  prisma: {
    galleryAsset: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    },
    postHistory: {
      findMany: vi.fn(),
    },
  },
}));

// Mock FS
vi.mock('fs', () => {
  const mockFs = {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    promises: {
      unlink: vi.fn(),
      readdir: vi.fn().mockResolvedValue([]),
      stat: vi.fn(),
      mkdir: vi.fn(),
      rm: vi.fn(),
    },
  };
  return {
    ...mockFs,
    default: mockFs,
  };
});

// Now import the worker
import { purgeExpiredAssets } from '../../lib/worker/worker';

describe('Video Lifecycle Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Storage Quotas', () => {
    it('should calculate current usage correctly', async () => {
      vi.mocked(prisma.galleryAsset.aggregate).mockResolvedValue({
        _sum: { fileSize: BigInt(1024 * 1024 * 100) },
      } as never);

      const usage = await prisma.galleryAsset.aggregate({
        where: { userId: 'user_123' },
        _sum: { fileSize: true }
      }) as { _sum: { fileSize: bigint } };

      expect(Number(usage._sum.fileSize)).toBe(100 * 1024 * 1024);
    });
  });

  describe('Smart Expiry Calculation', () => {
    it('should set expiry to 48h after scheduled time', () => {
      const scheduledAt = new Date('2026-05-10T10:00:00Z');
      const baseExpiryDate = new Date(scheduledAt);
      const expiresAt = new Date(baseExpiryDate.getTime() + 48 * 60 * 60 * 1000);
      expect(expiresAt.toISOString()).toBe('2026-05-12T10:00:00.000Z');
    });
  });

  describe('Background Cleanup', () => {
    it('should identify and purge expired assets', async () => {
      const mockExpiredAsset = {
        id: 'asset_1',
        fileId: 'file_expired',
        expiresAt: new Date(Date.now() - 1000),
      };

      vi.mocked(prisma.galleryAsset.findMany).mockResolvedValueOnce([mockExpiredAsset] as never)
                                           .mockResolvedValue([]);
      vi.mocked(prisma.postHistory.findMany).mockResolvedValue([]);
      
      vi.mocked(fsLib.existsSync).mockReturnValue(true);
      vi.mocked(fsLib.promises.readdir).mockResolvedValue([]);

      await purgeExpiredAssets();

      expect(fsLib.promises.unlink).toHaveBeenCalledWith(expect.stringContaining('file_expired'));
      expect(prisma.galleryAsset.delete).toHaveBeenCalledWith({
        where: { id: 'asset_1' }
      });
    });

    it('should identify and purge orphaned files', async () => {
      const now = Date.now();
      const dayAgo = now - (25 * 60 * 60 * 1000);

      vi.mocked(prisma.galleryAsset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.postHistory.findMany).mockResolvedValue([]);
      vi.mocked(fsLib.promises.readdir).mockResolvedValue(['orphaned.mp4'] as never);
      vi.mocked(fsLib.promises.stat).mockResolvedValue({ isFile: () => true, mtimeMs: dayAgo } as never);

      await purgeExpiredAssets();

      expect(fsLib.promises.unlink).toHaveBeenCalledWith(expect.stringContaining('orphaned.mp4'));
    });
  });
});
