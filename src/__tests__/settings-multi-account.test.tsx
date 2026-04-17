import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from '../app/settings/page';
import { useSession } from 'next-auth/react';
import { getUserAccounts, toggleAccountDistribution } from '../app/actions/user';

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
}));

// Mock Server Actions
vi.mock('../app/actions/user', () => ({
  getUserAccounts: vi.fn(),
  toggleAccountDistribution: vi.fn(),
}));

describe('Settings Multi-Account Management', () => {
  const mockAccounts = [
    { id: 'acc_yt_1', provider: 'google', accountName: 'thoufiq.ar', isDistributionEnabled: true },
    { id: 'acc_yt_2', provider: 'google', accountName: 'other.channel', isDistributionEnabled: true },
    { id: 'acc_tk_1', provider: 'tiktok', accountName: 'tiktok_handle', isDistributionEnabled: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({ data: { user: { id: 'u1' } }, status: 'authenticated' } as any);
    vi.mocked(getUserAccounts).mockResolvedValue(mockAccounts as any);
    vi.mocked(toggleAccountDistribution).mockResolvedValue({ success: true });
  });

  it('renders the hardcoded platform list', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('YouTube Shorts')[0]).toBeInTheDocument();
      expect(screen.getAllByText('TikTok')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Instagram Reels')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Facebook')[0]).toBeInTheDocument();
    });
  });

  it('displays connected handles in the connection blocks', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      // YouTube section should show handles
      expect(screen.getByText('@thoufiq.ar')).toBeInTheDocument();
      expect(screen.getByText('@other.channel')).toBeInTheDocument();
      
      // TikTok section should show handle
      expect(screen.getByText('@tiktok_handle')).toBeInTheDocument();
    });
  });

  it('toggles a platform level switch and updates all related accounts', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => screen.getByText('YouTube Shorts'));
    
    // The "YouTube Shorts" switch should be checked because both accounts are enabled
    const ytSwitch = screen.getByLabelText('Toggle YouTube Shorts distribution');
    
    // Toggle OFF
    fireEvent.click(ytSwitch);
    
    // It should call toggleAccountDistribution twice (once for each YT account) with isEnabled=false
    await waitFor(() => {
      expect(toggleAccountDistribution).toHaveBeenCalledTimes(2);
      expect(toggleAccountDistribution).toHaveBeenCalledWith('acc_yt_1', false);
      expect(toggleAccountDistribution).toHaveBeenCalledWith('acc_yt_2', false);
    });
  });

  it('requires connecting an account before enabling a platform', async () => {
    // Return no accounts for Instagram
    vi.mocked(getUserAccounts).mockResolvedValue([
      { id: 'acc_yt_1', provider: 'google', accountName: 'thoufiq.ar', isDistributionEnabled: true }
    ] as any);
    
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<SettingsPage />);
    
    await waitFor(() => screen.getByText('Instagram Reels'));
    
    const instaSwitch = screen.getByLabelText('Toggle Instagram Reels distribution');
    
    fireEvent.click(instaSwitch);
    
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Please connect a instagram account below'));
    expect(toggleAccountDistribution).not.toHaveBeenCalled();
  });
});
