import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  listUpcomingPostsTool, 
  getMediaGalleryTool, 
  scheduleVideoTool,
  updatePostTool,
  cancelPostTool
} from '@/lib/actions/ai-chat';
import * as historyActions from '@/app/actions/history';
import { prisma } from '@/lib/core/prisma';

// Mock dependencies
vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    galleryAsset: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/core/action-utils', () => ({
  protectedAction: vi.fn((cb) => cb('test-user-id')),
}));

vi.mock('@/app/actions/history', () => ({
  getUpcomingPosts: vi.fn(),
  savePostHistory: vi.fn(),
  updateScheduledPost: vi.fn(),
  deleteScheduledPost: vi.fn(),
}));

describe('AI Chatbot Integration Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUpcomingPostsTool', () => {
    it('should return posts from getUpcomingPosts', async () => {
      const mockPosts = [{ id: '1', title: 'Test Post' }];
      vi.mocked(historyActions.getUpcomingPosts).mockResolvedValue(mockPosts as unknown as Awaited<ReturnType<typeof historyActions.getUpcomingPosts>>);

      const result = await listUpcomingPostsTool();
      expect(result).toEqual(mockPosts);
      expect(historyActions.getUpcomingPosts).toHaveBeenCalled();
    });
  });

  describe('getMediaGalleryTool', () => {
    it('should return transformed assets from prisma', async () => {
      const mockAssets = [
        { fileId: 'f1', fileName: 'v1.mp4', fileSize: 1024, createdAt: new Date() }
      ];
      vi.mocked(prisma.galleryAsset.findMany).mockResolvedValue(mockAssets as unknown as Awaited<ReturnType<typeof prisma.galleryAsset.findMany>>);

      const result = await getMediaGalleryTool();
      expect(result).toHaveLength(1);
      expect(result[0].fileId).toBe('f1');
      expect(prisma.galleryAsset.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: 'test-user-id',
          expiresAt: { gt: expect.any(Date) }
        }
      }));
    });
  });

  describe('scheduleVideoTool', () => {
    it('should call savePostHistory with correctly formatted data', async () => {
      const params = {
        fileId: 'f1',
        title: 'New Video',
        scheduledAt: '2026-05-20T10:00:00Z',
        platforms: ['youtube', 'tiktok']
      };
      
      vi.mocked(historyActions.savePostHistory).mockResolvedValue({ success: true } as unknown as Awaited<ReturnType<typeof historyActions.savePostHistory>>);

      await scheduleVideoTool(params);

      expect(historyActions.savePostHistory).toHaveBeenCalledWith(expect.objectContaining({
        title: 'New Video',
        stagedFileId: 'f1',
        scheduledAt: new Date('2026-05-20T10:00:00Z'),
        videoFormat: 'short'
      }));
    });
  });

  describe('updatePostTool', () => {
    it('should call updateScheduledPost', async () => {
      const data = { title: 'Updated' };
      await updatePostTool('id1', data);
      expect(historyActions.updateScheduledPost).toHaveBeenCalledWith('id1', data);
    });
  });

  describe('cancelPostTool', () => {
    it('should call deleteScheduledPost', async () => {
      await cancelPostTool('id1');
      expect(historyActions.deleteScheduledPost).toHaveBeenCalledWith('id1');
    });
  });
});
