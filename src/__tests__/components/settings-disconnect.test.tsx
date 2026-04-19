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

describe('Settings Disconnect Functionality', () => {
  const mockAccounts = [
    { id: 'acc_yt_1', provider: 'google', accountName: 'thoufiq.ar', isDistributionEnabled: true },
    { id: 'acc_tk_1', provider: 'tiktok', accountName: 'tiktok_handle', isDistributionEnabled: false },
  ];

  const mockPreferences = [
    { id: 'p1', userId: 'u1', platformId: 'youtube', isEnabled: true },
    { id: 'p2', userId: 'u1', platformId: 'tiktok', isEnabled: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({ data: { user: { id: 'u1' } }, status: 'authenticated' } as any);
    vi.mocked(getUserAccounts).mockResolvedValue(mockAccounts as any);
    vi.mocked(getPlatformPreferences).mockResolvedValue(mockPreferences as any);
    vi.mocked(disconnectAccount).mockResolvedValue({ success: true });
    
    // Mock window.confirm
    vi.stubGlobal('confirm', vi.fn(() => true));
    // Mock window.alert
    vi.stubGlobal('alert', vi.fn());
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
