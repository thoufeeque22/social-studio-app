import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '../app/page';
import { useSession } from 'next-auth/react';
import { getUserAccounts, getPlatformPreferences } from '../app/actions/user';

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// Mock Server Actions
vi.mock('../app/actions/user', () => ({
  getUserAccounts: vi.fn(),
  getPlatformPreferences: vi.fn(),
}));

// Mock fetch globally
global.fetch = vi.fn();
global.alert = vi.fn();

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
    
    await waitFor(() => screen.getByText('@thoufiq.ar'));
    
    const ytBtn = screen.getByRole('button', { name: 'youtube: @thoufiq.ar' });
    const otherBtn = screen.getByRole('button', { name: 'youtube: @other.channel' });

    await waitFor(() => {
      expect(ytBtn).toHaveAttribute('aria-pressed', 'true');
    });
    expect(otherBtn).toHaveAttribute('aria-pressed', 'false');

    // Toggle YT 1 off
    fireEvent.click(ytBtn);
    expect(ytBtn).toHaveAttribute('aria-pressed', 'false');

    // Toggle Other on
    fireEvent.click(otherBtn);
    expect(otherBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('submits successfully to multiple platforms', async () => {
    render(<Home />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'youtube: @thoufiq.ar' })).toHaveAttribute('aria-pressed', 'true');
    });

    // 1. Fill fields
    fireEvent.change(screen.getByPlaceholderText(/catchy title/i), { target: { value: 'Test Title' } });
    
    // 2. Mock file
    const file = new File(['dummy content'], 'test.mp4', { type: 'video/mp4' });

    // 3. Mock FormData for JSDOM (which doesn't handle files well)
    const originalFormData = global.FormData;
    global.FormData = class {
      private data = new Map();
      constructor() {
        this.data.set('file', file);
        this.data.set('title', 'Test Title');
      }
      append(key: string, val: any) { this.data.set(key, val); }
      get(key: string) { return this.data.get(key); }
      entries() { return Array.from(this.data.entries()); }
    } as any;

    try {
      // 4. Force submit
      const form = screen.getByLabelText('Upload Form');
      fireEvent.submit(form);

      // 5. Verify fetch calls (youtube and tiktok from mockAccounts)
      await waitFor(() => {
        const calls = vi.mocked(global.fetch).mock.calls.map(c => c[0]);
        expect(calls).toContain('/api/upload/youtube');
        expect(calls).toContain('/api/upload/tiktok');
      }, { timeout: 4000 });
    } finally {
      global.FormData = originalFormData;
    }
  });

  it('shows error if no platforms selected', async () => {
    render(<Home />);
    
    await waitFor(() => screen.getByText('@thoufiq.ar'));

    // Unselect all
    fireEvent.click(screen.getByRole('button', { name: 'youtube: @thoufiq.ar' }));
    fireEvent.click(screen.getByRole('button', { name: 'tiktok: @tiktok_handle' }));

    expect(screen.getByText(/please select at least one account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post video/i })).toBeDisabled();
  });
});
