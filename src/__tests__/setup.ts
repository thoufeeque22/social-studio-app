import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

// Mock server-side next-auth to prevent next/server resolution issues in JSDOM
vi.mock('next-auth', () => ({
  default: vi.fn(),
  auth: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock Next.js Server (NextResponse, NextRequest)
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: vi.fn((data, init) => ({
        status: init?.status || 200,
        json: async () => data,
      })),
      redirect: vi.fn((url) => ({
        status: 307,
        headers: { get: () => url }
      }))
    },
    NextRequest: vi.fn(),
  };
});

// Mock server-only to prevent test crashes
vi.mock('server-only', () => ({}));
