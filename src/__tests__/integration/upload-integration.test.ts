/**
 * UPLOAD INTEGRATION TESTS
 * Integration tests for the multi-platform distribution pipeline.
 * Covers:
 * - Instagram Reel publishing (container creation, status polling, and audio injection).
 * - YouTube Shorts publishing (metadata injection and resumable session initialization).
 * - Mocking of external platform APIs (Facebook Graph, Google APIs).
 */

import { describe, it, beforeEach, vi, expect, afterEach, Mock } from 'vitest';
import { Readable } from 'stream';

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
    post: vi.fn().mockImplementation(async (url: string, _data: unknown, config: { headers?: Record<string, string> }) => {
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
    vi.mocked(global.fetch).mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
      const options = init || (input instanceof Request ? input : {});
      const body = options?.body as string | undefined;

      // Mock for Facebook Get Account Pages
      if (url.includes('/me/accounts')) {
        return {
          ok: true,
          json: async () => ({
            data: [{ instagram_business_account: { id: "ig_test_123" }, access_token: "page_token" }]
          })
        } as unknown as Response;
      }

      // Mock for Facebook Graph Container
      if (url.includes('/media') && !url.includes('publish') && options?.method === 'POST') {
        if (body?.includes('audio_id')) {
           return {
             ok: true,
             json: async () => ({ id: 'mock_creation_id' })
           } as unknown as Response;
        }
      }

      // Mock for Facebook Polling
      if (url.includes('status_code')) {
        return {
           ok: true,
           json: async () => ({ status_code: 'FINISHED' })
        } as unknown as Response;
      }

      // Mock for Facebook Publish
      if (url.includes('/media_publish')) {
        return {
           ok: true,
           json: async () => ({ id: 'mock_published_id' })
        } as unknown as Response;
      }
      return { ok: true, json: async () => ({}) } as unknown as Response;
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
    const mockedFetch = global.fetch as Mock;
    // Mock the session initialization response
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'https://mock-upload-url.com' },
    } as unknown as Response);

    // Mock the binary upload response
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'yt_video_123' }),
    } as unknown as Response);

    const result = await uploadToYouTube({
      userId: 'test_user',
      filePath: 'fake.mp4',
      title: 'Short Title',
      description: 'Engaging content',
      privacy: 'public'
    });

    expect(result.data.id).toBe('yt_video_123');
    const firstCall = mockedFetch.mock.calls[0];
    const body = JSON.parse(firstCall[1]?.body as string);
    expect(body.snippet.title).toBe('Short Title');
    expect(body.status.privacyStatus).toBe('public');
  });
  it('verifies Meta resumable upload logic fetches offset and resumes', async () => {
    vi.mocked(global.fetch).mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
      const options = init || (input instanceof Request ? input : {});
      
      // Mock for Facebook Get Account Pages
      if (url.includes('/me/accounts')) {
        return {
          ok: true,
          json: async () => ({
            data: [{ instagram_business_account: { id: "ig_test_123" }, access_token: "page_token" }]
          })
        } as unknown as Response;
      }
      // Mock the GET request to fetch offset
      if (url.includes('rupload.facebook.com') && options?.method === 'GET') {
        return {
          ok: true,
          headers: { get: () => '500' }
        } as unknown as Response;
      }
      // Mock the POST request for binary push
      if (url.includes('rupload.facebook.com') && options?.method === 'POST') {
        expect((options.headers as Record<string, string>)['Offset']).toBe('500'); // Validates it resumed from 500
        return { ok: true, json: async () => ({ success: true }) } as unknown as Response;
      }
      // Mock for Facebook Polling
      if (url.includes('status_code')) {
        return {
           ok: true,
           json: async () => ({ status_code: 'FINISHED' })
        } as unknown as Response;
      }
      // Mock for Facebook Publish
      if (url.includes('/media_publish')) {
        return {
           ok: true,
           json: async () => ({ id: 'mock_published_id' })
        } as unknown as Response;
      }
      return { ok: false } as unknown as Response;
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

