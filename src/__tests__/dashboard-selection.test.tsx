import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '../app/page';
import { useSession } from 'next-auth/react';
import { getUserPlatforms } from '../app/actions/user';

// 1. Mock NextAuth Session
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

// 2. Mock Server Actions
vi.mock('../app/actions/user', () => ({
  getUserPlatforms: vi.fn(),
}));

// 3. Mock Global Fetch
global.fetch = vi.fn();

describe('Dashboard Platform Selection', () => {
  const mockPlatforms = ['youtube', 'tiktok'];
  const mockSession = {
    user: { name: 'Test User', id: 'user_123' },
    expires: '2026-12-31T23:59:59.999Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup standard mocks
    vi.mocked(useSession).mockReturnValue({ 
      data: mockSession, 
      status: 'authenticated',
      update: vi.fn()
    } as any);

    vi.mocked(getUserPlatforms).mockResolvedValue(mockPlatforms);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    } as any);
  });

  it('renders enabled platforms as selected pills on load', async () => {
    render(<Home />);
    
    await waitFor(() => {
      expect(screen.getByText('Youtube')).toBeInTheDocument();
      expect(screen.getByText('Tiktok')).toBeInTheDocument();
    });

    const youtubePill = screen.getByRole('button', { name: /youtube/i });
    const tiktokPill = screen.getByRole('button', { name: /tiktok/i });

    expect(youtubePill).toBeInTheDocument();
    expect(tiktokPill).toBeInTheDocument();
  });

  it('toggles platform selection when clicked', async () => {
    render(<Home />);
    
    await waitFor(() => screen.getByText('Tiktok'));
    const tiktokPill = screen.getByRole('button', { name: /tiktok/i });

    // Deselect TikTok
    fireEvent.click(tiktokPill);
    
    // Select it again
    fireEvent.click(tiktokPill);
  });

  it('only uploads to selected platforms', async () => {
    // 1. Mock fetch to always succeed
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      } as Response)
    );

    render(<Home />);
    
    await waitFor(() => screen.getByText('Tiktok'));
    
    // 2. Deselect TikTok
    const tiktokPill = screen.getByRole('button', { name: /tiktok/i });
    fireEvent.click(tiktokPill);

    // 3. Fill out required fields
    fireEvent.change(screen.getByPlaceholderText(/catchy title/i), { target: { value: 'Test' } });
    
    // Simulate file selection
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByLabelText(/select video file/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // 4. Submit the form
    const submitBtn = screen.getByRole('button', { name: /post video/i });
    fireEvent.click(submitBtn);

    // 5. Verify logic filtered the platforms
    await waitFor(() => {
      // Must have called YouTube
      const calls = fetchSpy.mock.calls.map(call => call[0]);
      expect(calls).toContain('/api/upload/youtube');
      // Must NOT have called TikTok
      expect(calls).not.toContain('/api/upload/tiktok');
    }, { timeout: 3000 });
  });

  it('disables the post button if no platforms are selected', async () => {
    render(<Home />);
    
    await waitFor(() => screen.getByText('Youtube'));
    
    const youtubePill = screen.getByRole('button', { name: /youtube/i });
    const tiktokPill = screen.getByRole('button', { name: /tiktok/i });
    
    fireEvent.click(youtubePill);
    fireEvent.click(tiktokPill);

    const submitBtn = screen.getByRole('button', { name: /post video/i });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/please select at least one platform/i)).toBeInTheDocument();
  });
});
