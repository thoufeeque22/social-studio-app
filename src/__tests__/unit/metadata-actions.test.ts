import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMetadataTemplates, createMetadataTemplate, deleteMetadataTemplate } from '@/app/actions/metadata';
import { prisma } from '@/lib/core/prisma';
import { auth } from '@/auth';

// Mock Prisma
vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    metadataTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock Auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock revalidateDashboard
vi.mock('@/lib/core/action-utils', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    revalidateDashboard: vi.fn(),
  };
});

describe('Metadata Actions', () => {
  const mockUserId = 'user-123';
  const mockSession = { user: { id: mockUserId } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
  });

  describe('getMetadataTemplates', () => {
    it('fetches templates for the current user', async () => {
      const mockTemplates = [
        { id: 't1', name: 'T1', content: 'C1', userId: mockUserId },
      ];
      vi.mocked(prisma.metadataTemplate.findMany).mockResolvedValue(mockTemplates as any);

      const result = await getMetadataTemplates();

      expect(prisma.metadataTemplate.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual(mockTemplates);
    });

    it('throws error if unauthorized', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      await expect(getMetadataTemplates()).rejects.toThrow('Unauthorized');
    });
  });

  describe('createMetadataTemplate', () => {
    it('creates a new template', async () => {
      const input = { name: 'New Template', content: 'New Content' };
      const mockCreated = { id: 't2', ...input, userId: mockUserId };
      vi.mocked(prisma.metadataTemplate.create).mockResolvedValue(mockCreated as any);

      const result = await createMetadataTemplate(input);

      expect(prisma.metadataTemplate.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          name: input.name,
          content: input.content,
        },
      });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('deleteMetadataTemplate', () => {
    it('deletes a template if owned by user', async () => {
      const templateId = 't1';
      vi.mocked(prisma.metadataTemplate.findUnique).mockResolvedValue({
        id: templateId,
        userId: mockUserId,
      } as any);

      const result = await deleteMetadataTemplate(templateId);

      expect(prisma.metadataTemplate.delete).toHaveBeenCalledWith({
        where: { id: templateId },
      });
      expect(result).toEqual({ success: true });
    });

    it('throws error if template not owned by user', async () => {
      const templateId = 't1';
      vi.mocked(prisma.metadataTemplate.findUnique).mockResolvedValue({
        id: templateId,
        userId: 'other-user',
      } as any);

      await expect(deleteMetadataTemplate(templateId)).rejects.toThrow('unauthorized');
      expect(prisma.metadataTemplate.delete).not.toHaveBeenCalled();
    });
  });
});
