/**
 * LAYOUT WRAPPER TESTS
 * Verifies the conditional rendering of the main application shell.
 * Ensures that Sidebar and Header are:
 * - Hidden on public/auth pages like /login.
 * - Displayed on internal dashboard and settings pages.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
import { usePathname } from 'next/navigation';

// Mock next/navigation specifically for control
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock components to simplify detection
vi.mock('@/components/layout/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar Mock</div>,
}));
vi.mock('@/components/layout/Header', () => ({
  default: () => <div data-testid="header">Header Mock</div>,
}));

// Mock NextAuth useSession to avoid errors in real components
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

describe('LayoutWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only children when on the /login page (no sidebar/header)', () => {
    vi.mocked(usePathname).mockReturnValue('/login');
    
    render(
      <LayoutWrapper>
        <div data-testid="content">Login Page Content</div>
      </LayoutWrapper>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
  });

  it('renders sidebar, header, and content when on the dashboard (/)', () => {
    vi.mocked(usePathname).mockReturnValue('/');
    
    render(
      <LayoutWrapper>
        <div data-testid="content">Dashboard Content</div>
      </LayoutWrapper>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders layout components on internal pages like /settings', () => {
    vi.mocked(usePathname).mockReturnValue('/settings');
    
    render(
      <LayoutWrapper>
        <div data-testid="content">Settings Content</div>
      </LayoutWrapper>
    );
    
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });
});
