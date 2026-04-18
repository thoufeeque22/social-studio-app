import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from '../app/settings/page';
import { useSession } from 'next-auth/react';
import { getUserAccounts, togglePlatformPreference, getPlatformPreferences } from '../app/actions/user';

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
}));

// Mock Server Actions
vi.mock('../app/actions/user', () => ({
  getUserAccounts: vi.fn(),
  toggleAccountDistribution: vi.fn(),
  getPlatformPreferences: vi.fn(),
  togglePlatformPreference: vi.fn(),
}));

describe('Settings Multi-Account Management', () => {
  const mockAccounts = [
    { id: 'acc_yt_1', provider: 'google', accountName: 'thoufiq.ar', isDistributionEnabled: true },
    { id: 'acc_yt_2', provider: 'google', accountName: 'other.channel', isDistributionEnabled: true },
    { id: 'acc_tk_1', provider: 'tiktok', accountName: 'tiktok_handle', isDistributionEnabled: false },
  ];

  const mockPreferences = [
    { id: 'p1', userId: 'u1', platformId: 'youtube', isEnabled: true },
    { id: 'p2', userId: 'u1', platformId: 'tiktok', isEnabled: true },
    { id: 'p3', userId: 'u1', platformId: 'instagram', isEnabled: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({ data: { user: { id: 'u1' } }, status: 'authenticated' } as any);
    vi.mocked(getUserAccounts).mockResolvedValue(mockAccounts as any);
    vi.mocked(getPlatformPreferences).mockResolvedValue(mockPreferences as any);
    vi.mocked(togglePlatformPreference).mockResolvedValue({ success: true });
  });

  it('renders the hardcoded platform list in the grid', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('YouTube Shorts')[0]).toBeInTheDocument();
      expect(screen.getAllByText('TikTok')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Instagram Reels')[0]).toBeInTheDocument();
    });
  });

  it('displays connected segments ONLY for enabled platforms', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      // YouTube is enabled in prefs, so handles should be visible
      expect(screen.getByText('@thoufiq.ar')).toBeInTheDocument();
      expect(screen.getByText('@tiktok_handle')).toBeInTheDocument();
      
      // Instagram is NOT enabled in prefs (p3 above is false), so it should be hidden
      expect(screen.queryByText('Instagram')).not.toBeInTheDocument();
    });
  });

  it('toggles a platform visibility and calls togglePlatformPreference', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => screen.getByText('YouTube Shorts'));
    
    const ytSwitch = screen.getByLabelText('Toggle YouTube Shorts visibility');
    
    // Toggle OFF
    fireEvent.click(ytSwitch);
    
    await waitFor(() => {
      expect(togglePlatformPreference).toHaveBeenCalledWith('youtube', false); // Toggled from true to false.
    });
  });

  it('allows enabling a platform even with 0 accounts (to reveal connect button)', async () => {
    vi.mocked(getUserAccounts).mockResolvedValue([] as any);
    vi.mocked(getPlatformPreferences).mockResolvedValue([] as any);
    
    render(<SettingsPage />);
    
    await waitFor(() => screen.getByText('Instagram Reels'));
    
    // Initially hidden
    expect(screen.queryByText('Instagram')).not.toBeInTheDocument();
    
    const instaSwitch = screen.getByLabelText('Toggle Instagram Reels visibility');
    fireEvent.click(instaSwitch);
    
    await waitFor(() => {
      expect(togglePlatformPreference).toHaveBeenCalledWith('instagram', true); // Was false, toggled to true.
    });
  });

  it('verifies LinkedIn and Twitter visibility logic', async () => {
    // Only LinkedIn enabled
    vi.mocked(getPlatformPreferences).mockResolvedValue([
      { id: 'p_li', userId: 'u1', platformId: 'linkedin', isEnabled: true },
      { id: 'p_tw', userId: 'u1', platformId: 'twitter', isEnabled: false },
    ] as any);

    render(<SettingsPage />);

    await waitFor(() => {
      // LinkedIn heading should be visible in the connection grid
      expect(screen.getByRole('heading', { name: /LinkedIn/i })).toBeInTheDocument();
      // Twitter should be hidden
      expect(screen.queryByRole('heading', { name: /Twitter\/X/i })).not.toBeInTheDocument();
    });
  });
});
