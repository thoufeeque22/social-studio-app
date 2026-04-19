import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '../../app/page';
import { useSession } from 'next-auth/react';
import { getUserAccounts, getPlatformPreferences } from '../../app/actions/user';

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock Server Actions
vi.mock('../../app/actions/user', () => ({
  getUserAccounts: vi.fn(),
  getPlatformPreferences: vi.fn(),
}));

// Mock Upload Utils
vi.mock('../../lib/upload-utils', () => ({
  performMultiPlatformUpload: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock fetch globally
global.fetch = vi.fn();
global.alert = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Dashboard Account Selection', () => {
  const mockAccounts = [
    { id: 'acc_yt_1', provider: 'google', accountName: 'thoufiq.ar', isDistributionEnabled: true },
    { id: 'acc_tk_1', provider: 'tiktok', accountName: 'tiktok_handle', isDistributionEnabled: true },
    { id: 'acc_yt_2', provider: 'google', accountName: 'other.channel', isDistributionEnabled: false },
  ];
  
  const mockPreferences = [
    { id: 'p1', userId: 'user_1', platformId: 'youtube', isEnabled: true },
    { id: 'p2', userId: 'user_1', platformId: 'tiktok', isEnabled: true },
  ];

  const mockSession = { user: { name: 'Test User', id: 'user_1' }, expires: '' };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.mocked(useSession).mockReturnValue({ data: mockSession, status: 'authenticated' } as any);
    vi.mocked(getUserAccounts).mockResolvedValue(mockAccounts as any);
    vi.mocked(getPlatformPreferences).mockResolvedValue(mockPreferences as any);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    } as any);
  });

  it('renders correctly and allows toggling selection', async () => {
    render(<Home />);
    
    // Wait for sticky sync or initial load
    await waitFor(() => screen.getByText(/@thoufiq.ar/i));
    
    // Virtual ID check: YouTube handles are provider:id
    const ytBtn = screen.getByRole('button', { name: /youtube: @thoufiq.ar/i });
    const otherBtn = screen.getByRole('button', { name: /youtube: @other.channel/i });

    // Should be pressed by default if enabled in distribution
    await waitFor(() => {
      expect(ytBtn).toHaveAttribute('aria-pressed', 'true');
    });
    expect(otherBtn).toHaveAttribute('aria-pressed', 'false');

    // Toggle YT 1 off
    fireEvent.click(ytBtn);
    expect(ytBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('persists platform selection to localStorage on toggle', async () => {
    render(<Home />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /youtube: @thoufiq.ar/i })).toHaveAttribute('aria-pressed', 'true');
    });

    // Toggle off a platform — should persist to localStorage
    const ytBtn = screen.getByRole('button', { name: /youtube: @thoufiq.ar/i });
    fireEvent.click(ytBtn);

    // Wait for the useEffect to sync the updated selection to localStorage
    await waitFor(() => {
      const calls = localStorageMock.setItem.mock.calls.filter(
        (c: string[]) => c[0] === 'SS_SELECTED_PLATFORMS'
      );
      expect(calls.length).toBeGreaterThan(0);
      const lastSaved = JSON.parse(calls[calls.length - 1][1]);
      expect(lastSaved).not.toContain('acc_yt_1');
    });
  });
});
