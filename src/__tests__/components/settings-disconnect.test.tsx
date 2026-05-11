/**
 * SETTINGS DISCONNECT TESTS
 * Tests the account disconnection flow within the Settings page.
 * Verifies:
 * - Rendering of disconnect triggers (X buttons) for active accounts.
 * - User confirmation dialog (window.confirm) integration.
 * - Optimistic UI removal of disconnected accounts.
 * - Error handling and alert notifications on failure.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from '../../app/settings/page';
import { useSession } from 'next-auth/react';
import { getUserAccounts, disconnectAccount, getPlatformPreferences } from '../../app/actions/user';

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
}));

// Mock Server Actions
vi.mock('../../app/actions/user', () => ({
  getUserAccounts: vi.fn(),
  togglePlatformPreference: vi.fn(),
  getPlatformPreferences: vi.fn(),
  disconnectAccount: vi.fn(),
}));

interface MockAccount {
  id: string;
  provider: string;
  accountName: string | null;
  isDistributionEnabled: boolean;
}

interface MockPreference {
  id: string;
  userId: string;
  platformId: string;
  isEnabled: boolean;
}

describe('Settings Disconnect Functionality', () => {
  const mockAccounts: MockAccount[] = [
    { id: 'acc_yt_1', provider: 'google', accountName: 'thoufiq.ar', isDistributionEnabled: true },
    { id: 'acc_tk_1', provider: 'tiktok', accountName: 'tiktok_handle', isDistributionEnabled: false },
  ];

  const mockPreferences: MockPreference[] = [
    { id: 'p1', userId: 'u1', platformId: 'youtube', isEnabled: true },
    { id: 'p2', userId: 'u1', platformId: 'tiktok', isEnabled: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: 'u1' }, expires: '' },
      status: 'authenticated',
      update: vi.fn(),
    } as ReturnType<typeof useSession>);
    vi.mocked(getUserAccounts).mockResolvedValue(mockAccounts as Awaited<ReturnType<typeof getUserAccounts>>);
    vi.mocked(getPlatformPreferences).mockResolvedValue(mockPreferences as Awaited<ReturnType<typeof getPlatformPreferences>>);
    vi.mocked(disconnectAccount).mockResolvedValue({ success: true } as Awaited<ReturnType<typeof disconnectAccount>>);
    
    // Mock window.confirm
    vi.stubGlobal('confirm', vi.fn(() => true));
    // Mock window.alert
    vi.stubGlobal('alert', vi.fn());

    // Silence expected console errors/warns
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('renders disconnect buttons (X) for connected accounts when platforms are active', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      // Find all buttons with "Disconnect account" title
      const disconnectButtons = screen.getAllByTitle('Disconnect account');
      expect(disconnectButtons.length).toBe(2);
    });
  });

  it('cancels disconnection if user rejects confirmation', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    
    render(<SettingsPage />);
    
    await waitFor(() => screen.getAllByTitle('Disconnect account'));
    
    const ytDisconnectBtn = screen.getAllByTitle('Disconnect account')[0];
    fireEvent.click(ytDisconnectBtn);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(disconnectAccount).not.toHaveBeenCalled();
  });

  it('proceeds with disconnection if user confirms', async () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    
    render(<SettingsPage />);
    
    await waitFor(() => screen.getAllByTitle('Disconnect account'));
    
    const ytDisconnectBtn = screen.getAllByTitle('Disconnect account')[0];
    fireEvent.click(ytDisconnectBtn);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(disconnectAccount).toHaveBeenCalledWith('acc_yt_1');
  });

  it('removes the account from the UI optimistically', async () => {
    // Delay the server action response to test optimistic update
    vi.mocked(disconnectAccount).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));
    
    render(<SettingsPage />);
    
    await waitFor(() => screen.getByText('@thoufiq.ar'));
    
    const ytDisconnectBtn = screen.getAllByTitle('Disconnect account')[0];
    fireEvent.click(ytDisconnectBtn);
    
    // Should be gone immediately (optimistic)
    expect(screen.queryByText('@thoufiq.ar')).not.toBeInTheDocument();
  });

  it('shows an alert if disconnection fails', async () => {
    vi.mocked(disconnectAccount).mockRejectedValue(new Error('Server error'));
    
    render(<SettingsPage />);
    
    await waitFor(() => screen.getAllByTitle('Disconnect account'));
    
    const ytDisconnectBtn = screen.getAllByTitle('Disconnect account')[0];
    fireEvent.click(ytDisconnectBtn);
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to disconnect account'));
    });
  });
});
