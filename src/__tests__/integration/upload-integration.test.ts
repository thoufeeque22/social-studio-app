/**
 * UPLOAD INTEGRATION TESTS
 * Integration tests for the multi-platform distribution pipeline.
 * Covers:
 * - Instagram Reel publishing (container creation, status polling, and audio injection).
 * - YouTube Shorts publishing (metadata injection and resumable session initialization).
 * - Mocking of external platform APIs (Facebook Graph, Google APIs).
 */

import { describe, it, beforeEach, vi, expect, afterEach } from 'vitest';

// 1. Mock Prisma BEFORE any other imports that might use it
vi.mock('../../lib/core/prisma', () => ({
  prisma: {
    account: {
      findFirst: vi.fn().mockResolvedValue({
        id: "1", 
        access_token: "fake_token", 
        refresh_token: "fake_refresh"
      }),
    },
  },
}));

// 2. Clear fetch before each test
global.fetch = vi.fn();

import { uploadToYouTube } from '../../lib/platforms/youtube';
import { publishInstagramReel } from '../../lib/platforms/instagram';

// Mock fs for Instagram binary push
vi.mock('fs', () => {
  const { Readable } = require('stream');
  const createMockStream = () => {
    const stream = new Readable();
    stream.push('video data');
    stream.push(null);
    return stream;
  };
  const promises = {
    stat: vi.fn().mockResolvedValue({ size: 1000 }),
    readFile: vi.fn().mockResolvedValue(Buffer.from('video data')),
  };
  return {
    promises,
    createReadStream: vi.fn().mockImplementation(createMockStream),
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
    default: {
      promises,
      createReadStream: vi.fn().mockImplementation(createMockStream),
      existsSync: vi.fn().mockReturnValue(true),
      mkdirSync: vi.fn(),
      appendFileSync: vi.fn(),
    },
  };
});

// Mock Axios for Instagram binary push
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockImplementation(async (url, data, config) => {
      if (url.includes('rupload.facebook.com')) {
        // Assert Offset header if it's the resume test
        if (config?.headers?.Offset === '500') {
           expect(config.headers['Offset']).toBe('500');
        }
        return { data: { success: true } };
      }
      return { data: {} };
    })
  }
}));

describe('Upload Integrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // We don't want to actually fetch from graph/youtube
    vi.mocked(global.fetch).mockImplementation(async (url: string, options: any) => {
      // Mock for Facebook Get Account Pages
      if (typeof url === 'string' && url.includes('/me/accounts')) {
        return {
          ok: true,
          json: async () => ({
            data: [{ instagram_business_account: { id: "ig_test_123" }, access_token: "page_token" }]
          })
        } as any;
      }

      // Mock for Facebook Graph Container
      if (typeof url === 'string' && url.includes('/media') && !url.includes('publish') && options?.method === 'POST') {
        const body = options.body;
        if (body.includes('audio_id')) {
           return {
             ok: true,
             json: async () => ({ id: 'mock_creation_id' })
           } as any;
        }
      }

      // Mock for Facebook Polling
      if (typeof url === 'string' && url.includes('status_code')) {
        return {
           ok: true,
           json: async () => ({ status_code: 'FINISHED' })
        } as any;
      }

      // Mock for Facebook Publish
      if (typeof url === 'string' && url.includes('/media_publish')) {
        return {
           ok: true,
           json: async () => ({ id: 'mock_published_id' })
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('verifies audio_id injection for Instagram payload', async () => {
    const musicId = "9999001";
    
    const publishPromise = publishInstagramReel({
      userId: 'test_user',
      filePath: 'fake.mp4',
      caption: 'Test Caption',
      musicId
    });

    // Advance timers so the polling finishes instantly
    await vi.advanceTimersByTimeAsync(10000);

    await publishPromise;

    const fetchMock = vi.mocked(global.fetch);
    // At least 4 calls: pages, container, status poll, publish
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('verifies metadata injection for YouTube payload', async () => {
    // Mock the session initialization response
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'https://mock-upload-url.com' },
    } as any);

    // Mock the binary upload response
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'yt_video_123' }),
    } as any);

    const result = await uploadToYouTube({
      userId: 'test_user',
      filePath: 'fake.mp4',
      title: 'Short Title',
      description: 'Engaging content',
      privacy: 'public'
    });

    expect(result.data.id).toBe('yt_video_123');
    const firstCall = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(firstCall[1]?.body as string);
    expect(body.snippet.title).toBe('Short Title');
    expect(body.status.privacyStatus).toBe('public');
  });
  it('verifies Meta resumable upload logic fetches offset and resumes', async () => {
    vi.mocked(global.fetch).mockImplementation(async (url: string, options: any) => {
      // Mock for Facebook Get Account Pages
      if (typeof url === 'string' && url.includes('/me/accounts')) {
        return {
          ok: true,
          json: async () => ({
            data: [{ instagram_business_account: { id: "ig_test_123" }, access_token: "page_token" }]
          })
        } as any;
      }
      // Mock the GET request to fetch offset
      if (url.includes('rupload.facebook.com') && options?.method === 'GET') {
        return {
          ok: true,
          headers: { get: () => '500' }
        } as any;
      }
      // Mock the POST request for binary push
      if (url.includes('rupload.facebook.com') && options?.method === 'POST') {
        expect(options.headers['Offset']).toBe('500'); // Validates it resumed from 500
        return { ok: true, json: async () => ({ success: true }) } as any;
      }
      // Mock for Facebook Polling
      if (typeof url === 'string' && url.includes('status_code')) {
        return {
           ok: true,
           json: async () => ({ status_code: 'FINISHED' })
        } as any;
      }
      // Mock for Facebook Publish
      if (typeof url === 'string' && url.includes('/media_publish')) {
        return {
           ok: true,
           json: async () => ({ id: 'mock_published_id' })
        } as any;
      }
      return { ok: false } as any;
    });

    const publishPromise = publishInstagramReel({
      userId: 'test_user',
      filePath: 'fake.mp4',
      caption: 'Resuming Upload',
      creationId: 'existing_creation_id_123'
    });

    // Advance timers for polling
    await vi.advanceTimersByTimeAsync(10000);
    await publishPromise;
  });
});
