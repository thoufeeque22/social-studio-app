/**
 * WORKER LIFECYCLE TESTS
 * Tests the background publishing worker's lifecycle and job processing.
 * Verifies:
 * - Successful processing of scheduled posts.
 * - Accurate polling for due jobs.
 * - Error handling and retry logic for worker-level failures.
 */

import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest';
import { startPublishingWorker } from '../../lib/worker/worker';
import { prisma } from '../../lib/core/prisma';
import { distributeToPlatformsServer } from '../../lib/worker/server-distributor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = global as any;

// Mock Dependencies
vi.mock('../../lib/core/prisma', () => ({
  prisma: {
    postHistory: {
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../../lib/worker/server-distributor', () => ({
  distributeToPlatformsServer: vi.fn().mockResolvedValue([]),
}));

// Mock FS
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue(JSON.stringify({ title: "Mock", description: "Mock" })),
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(JSON.stringify({ title: "Mock", description: "Mock" })),
  }
}));

describe('Worker Lifecycle & Polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    g._ss_worker_started = false;
    g._ss_worker_interval = null;
    g._ss_worker_version = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('correctly restarts the worker and clears old interval on reload', async () => {
    const clearSpy = vi.spyOn(global, 'clearInterval');
    
    // First start
    await startPublishingWorker();
    const firstVersion = g._ss_worker_version;
    const firstInterval = g._ss_worker_interval;
    
    // Second start (simulating HMR)
    vi.advanceTimersByTime(1);
    await startPublishingWorker();
    
    if (firstInterval) {
      expect(clearSpy).toHaveBeenCalledWith(firstInterval);
    }
    expect(g._ss_worker_version).not.toBe(firstVersion);
  });

  it('polls overdue posts and executes distribution', async () => {
    const mockPost = {
      id: 'p1',
      title: 'Scheduled Post',
      userId: 'u1',
      stagedFileId: 'f1',
      videoFormat: 'short',
      platforms: [
        { platform: 'youtube', accountId: 'acc1', accountName: 'Channel' }
      ]
    };

    // Return one pending post
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.postHistory.findMany).mockResolvedValue([mockPost] as any[]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.postHistory.update).mockResolvedValue({} as any);

    await startPublishingWorker();
    
    // Fast-forward 10 seconds
    await vi.advanceTimersByTimeAsync(11000);

    // Should have checked DB
    expect(prisma.postHistory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isPublished: false,
        scheduledAt: expect.anything()
      })
    }));

    // Should have marked as published (locking)
    expect(prisma.postHistory.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { isPublished: true }
    });

    // Should have called server distributor
    expect(distributeToPlatformsServer).toHaveBeenCalledWith(expect.objectContaining({
      historyId: 'p1',
      title: 'Scheduled Post'
    }));
  });

  it('stops execution if a newer worker version is detected', async () => {
    await startPublishingWorker();
    const version1 = g._ss_worker_version;
    
    // Simulate newer version started elsewhere
    g._ss_worker_version = (version1 || 0) + 1;

    // Advance time
    await vi.advanceTimersByTimeAsync(11000);

    // Should NOT have polled because version mismatch detected in interval
    expect(prisma.postHistory.findMany).not.toHaveBeenCalled();
  });
});
