import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Sidebar from '../../components/layout/Sidebar';
import { SessionProvider } from 'next-auth/react';
import React from 'react';

// Mock useSession
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: { user: { name: 'Test User' } },
    status: 'authenticated',
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Sidebar Component', () => {
  it('renders all navigation links including Home and Media Gallery', () => {
    render(
      <SessionProvider>
        <Sidebar isOpen={true} onClose={() => {}} />
      </SessionProvider>
    );

    // Sidebar should have links to Home (Dashboard) and Media Gallery
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Media Gallery')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    
    // Check icons or emoji representation
    expect(screen.getByText('📊')).toBeInTheDocument(); // Dashboard icon
    expect(screen.getByText('🖼️')).toBeInTheDocument(); // Media Gallery icon
  });

  it('contains a link back to the home page via the logo', () => {
    render(
      <SessionProvider>
        <Sidebar isOpen={true} onClose={() => {}} />
      </SessionProvider>
    );

    const logoLink = screen.getByText('SocialStudio').closest('a');
    expect(logoLink).toHaveAttribute('href', '/');
  });
});
