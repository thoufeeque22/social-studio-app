import { vi, describe, it, expect } from 'vitest';

// Mock NextAuth BEFORE other imports
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock('@/auth', () => ({
  handlers: { GET: vi.fn(), POST: vi.fn() },
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock child components that use complex hooks
vi.mock('@/components/dashboard/SidebarInfo', () => ({
  default: () => <div data-testid="sidebar-info" />
}));

vi.mock('@/components/dashboard/DashboardHeader', () => ({
  default: () => <div data-testid="dashboard-header" />
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { Session } from 'next-auth';
import * as uploadUtils from '@/lib/upload/upload-utils';

// Mock the distribution engine
vi.mock('@/lib/upload/upload-utils', async () => {
  const actual = await vi.importActual<typeof uploadUtils>('@/lib/upload/upload-utils');
  return {
    ...actual,
    distributeToPlatforms: vi.fn(),
  };
});

const mockSession: Session = {
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
  expires: new Date().toISOString(),
};

const mockAccounts = [
  { id: '1', provider: 'facebook', accountName: 'FB Page' },
  { id: '2', provider: 'google', accountName: 'YT Channel' },
];

describe('Distribution Resilience', () => {
  it('should correctly display mixed statuses (Success, Failed, Cancelled)', async () => {
    // 1. Mock a mixed outcome
    vi.mocked(uploadUtils.distributeToPlatforms).mockResolvedValue({
      platformResults: [
        { accountId: 'facebook:1', status: 'success', platform: 'facebook', accountName: 'FB Page' },
        { accountId: 'google:2', status: 'failed', errorMessage: 'Quota Exceeded', platform: 'youtube', accountName: 'YT' },
      ],
    });

    render(<DashboardClient session={mockSession} initialAccounts={mockAccounts} initialPreferences={[]} />);

    // 2. Select accounts and start upload
    const postButton = screen.getByText(/Post/i);
    fireEvent.click(postButton);

    // 3. Verify the final UI state
    await waitFor(() => {
      // Facebook should be Success
      const fbBadge = screen.getByLabelText(/facebook/i);
      expect(fbBadge.innerHTML).toContain('polyline'); // Success icon
      
      // YouTube should be Failed
      const ytBadge = screen.getByLabelText(/youtube/i);
      expect(ytBadge.innerHTML).toContain('line'); // X icon
    }, { timeout: 5000 });
  });

  it('should mark platforms as cancelled when aborted', async () => {
    vi.mocked(uploadUtils.distributeToPlatforms).mockImplementation(({ onPlatformStatus }) => {
       return new Promise((_, reject) => {
         setTimeout(() => {
           onPlatformStatus?.('facebook:1', 'cancelled');
           const err = new Error('Signal Aborted');
           err.name = 'AbortError';
           reject(err);
         }, 50);
       });
    });

    render(<DashboardClient session={mockSession} initialAccounts={mockAccounts} initialPreferences={[]} />);

    const postButton = screen.getByText(/Post/i);
    fireEvent.click(postButton);

    // Verify HUD appears
    const stopAllButton = await screen.findByText(/STOP ALL/i);
    fireEvent.click(stopAllButton);

    // Verify Gray/Dashed state
    await waitFor(() => {
      const fbBadge = screen.getByLabelText(/facebook/i);
      expect(fbBadge.innerHTML).toContain('rect'); // Stop icon
    }, { timeout: 5000 });
  });
});
