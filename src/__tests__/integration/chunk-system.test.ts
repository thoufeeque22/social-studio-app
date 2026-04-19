import { describe, it, beforeEach, vi, expect } from 'vitest';
import { POST as chunkPOST } from '../../app/api/upload/chunk/route';
import { POST as assemblePOST } from '../../app/api/upload/assemble/route';
import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { promises as fsPromises } from 'fs';
import fsSync from 'fs';

// Mock Auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Setup base mocks
vi.mock('fs', () => {
  const promises = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.from('data')),
    readdir: vi.fn().mockResolvedValue([]),
    unlink: vi.fn().mockResolvedValue(undefined),
    rmdir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 1000 }),
  };

  return {
    promises,
    createWriteStream: vi.fn(() => ({
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn((event, cb) => {
        if (event === 'finish') cb();
        return { on: vi.fn() };
      }),
    })),
    existsSync: vi.fn().mockReturnValue(true),
    // For aliases
    default: {
      promises,
      existsSync: vi.fn().mockReturnValue(true),
      createWriteStream: vi.fn(() => ({
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn((event, cb) => {
          if (event === 'finish') cb();
          return { on: vi.fn() };
        }),
      })),
    }
  };
});

// Alias for fs/promises to ensure consistent mocking
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from('data')),
  readdir: vi.fn().mockResolvedValue([]),
  unlink: vi.fn().mockResolvedValue(undefined),
  rmdir: vi.fn().mockResolvedValue(undefined),
  stat: vi.fn().mockResolvedValue({ size: 1000 }),
}));

describe('Chunked Upload System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).mockResolvedValue({ user: { id: 'u1' } });
  });

  describe('Chunk API', () => {
    it('saves a binary chunk to correctly named part file', async () => {
      const mockBuffer = Buffer.from('chunk data');
      const req = {
        headers: {
          get: (name: string) => {
            if (name === 'x-upload-id') return 'upload-123';
            if (name === 'x-chunk-index') return '5';
            return null;
          }
        },
        arrayBuffer: async () => mockBuffer.buffer,
      } as unknown as NextRequest;

      const response = await chunkPOST(req);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(fsPromises.mkdir).toHaveBeenCalled();
      expect(fsPromises.writeFile).toHaveBeenCalled();
    });
  });

  describe('Assemble API', () => {
    it('joins all chunks into a final file', async () => {
      (fsPromises.readdir as any).mockResolvedValue(['00000000.part', '00000001.part']);
      (fsPromises.readFile as any).mockResolvedValue(Buffer.from('part data'));

      const req = {
        json: async () => ({
          uploadId: 'upload-123',
          fileName: 'test.mp4',
          totalChunks: 2
        })
      } as unknown as NextRequest;

      const response = await assemblePOST(req);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(fsPromises.readFile).toHaveBeenCalledTimes(2);
      expect(fsPromises.unlink).toHaveBeenCalledTimes(2);
    });

    it('returns error if chunks are missing', async () => {
      (fsPromises.readdir as any).mockResolvedValue(['00000000.part']);

      const req = {
        json: async () => ({
          uploadId: 'upload-123',
          fileName: 'test.mp4',
          totalChunks: 2
        })
      } as unknown as NextRequest;

      const response = await assemblePOST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Chunk mismatch');
    });
  });
});
