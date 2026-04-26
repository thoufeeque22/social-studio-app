import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Next-Auth
vi.mock('next-auth', () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}));

// Mock Next-Auth React
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Next Navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
  })),
  usePathname: vi.fn(),
}));

// Mock global fetch
global.fetch = vi.fn((url) => {
  return Promise.resolve({
    ok: true,
    json: () => {
      if (url.toString().includes('/api/history/')) {
        return Promise.resolve({
          data: {
            id: 'hist_123',
            title: 'Resumed Post',
            description: 'Description',
            videoFormat: 'short',
            platforms: [{ platform: 'youtube', accountId: 'acc_yt_1', accountName: 'YouTube Account' }]
          }
        });
      }
      return Promise.resolve({});
    },
  } as Response);
});
