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
