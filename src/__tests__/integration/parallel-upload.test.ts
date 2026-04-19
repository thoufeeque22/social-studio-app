import { describe, it, beforeEach, vi, expect } from 'vitest';
import { distributeToPlatforms } from '../../lib/upload/upload-utils';

describe('Parallel Distribution Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should trigger uploads in parallel for small files', async () => {
    const onPlatformStatus = vi.fn();
    
    // Mock fetch to have a delay so we can see them in flight
    vi.mocked(global.fetch).mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 100));
      return { ok: true, json: async () => ({ id: '123' }) } as any;
    });

    const formData = new FormData();
    // 10MB file -> concurrency should be 4
    formData.append('file', new Blob(['small'], { type: 'video/mp4' }), 'test.mp4');

    const selectedAccountIds = ['platform1', 'platform2', 'platform3', 'platform4'];
    const accounts = selectedAccountIds.map(id => ({ id, provider: id, accountName: id } as any));

    const distributionPromise = distributeToPlatforms({
      stagedFileId: 'stage1',
      fileName: 'test.mp4',
      formData,
      accounts,
      selectedAccountIds,
      contentMode: 'Manual',
      videoFormat: 'short',
      onStatusUpdate: () => {},
      onPlatformStatus
    });

    // Immediately check if all were set to 'uploading'
    // Wait a tiny bit for the microtask queue
    await new Promise(r => setTimeout(r, 10));

    expect(onPlatformStatus).toHaveBeenCalledWith('platform1', 'uploading');
    expect(onPlatformStatus).toHaveBeenCalledWith('platform2', 'uploading');
    expect(onPlatformStatus).toHaveBeenCalledWith('platform3', 'uploading');
    expect(onPlatformStatus).toHaveBeenCalledWith('platform4', 'uploading');

    await distributionPromise;
    expect(onPlatformStatus).toHaveBeenCalledWith('platform1', 'success');
  });

  it('should limit concurrency for large files', async () => {
    const onPlatformStatus = vi.fn();
    
    // Control fetch completion
    let activeRequests = 0;
    let maxConcurrent = 0;

    vi.mocked(global.fetch).mockImplementation(async () => {
      activeRequests++;
      maxConcurrent = Math.max(maxConcurrent, activeRequests);
      await new Promise(r => setTimeout(r, 50));
      activeRequests--;
      return { ok: true, json: async () => ({ id: '123' }) } as any;
    });

    const formData = new FormData();
    // 400MB file -> concurrency should be 1
    const largeBlob = new Blob([new ArrayBuffer(400 * 1024 * 1024)]);
    formData.append('file', largeBlob, 'large.mp4');

    const selectedAccountIds = ['p1', 'p2', 'p3'];
    const accounts = selectedAccountIds.map(id => ({ id, provider: id, accountName: id } as any));

    await distributeToPlatforms({
      stagedFileId: 'stage2',
      fileName: 'large.mp4',
      formData,
      accounts,
      selectedAccountIds,
      contentMode: 'Manual',
      videoFormat: 'short',
      onStatusUpdate: () => {},
      onPlatformStatus
    });

    // Concurrency for >300MB should be 1
    expect(maxConcurrent).toBe(1);
  });
});
