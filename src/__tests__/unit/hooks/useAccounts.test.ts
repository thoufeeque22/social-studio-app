/**
 * USE ACCOUNTS HOOK TESTS
 * Tests the useAccounts custom hook which manages user social accounts and preferences.
 * Focuses on:
 * - Data fetching on mount vs initial data injection.
 * - Optimistic UI updates for distribution toggles.
 * - State rollback on server action failures.
 * - Account disconnection logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccounts } from '@/hooks/useAccounts';
import * as userActions from '@/app/actions/user';

// Mock server actions
vi.mock('@/app/actions/user', () => ({
  getUserAccounts: vi.fn(),
  getPlatformPreferences: vi.fn(),
  toggleAccountDistribution: vi.fn(),
  disconnectAccount: vi.fn(),
  togglePlatformPreference: vi.fn(),
}));

describe('useAccounts', () => {
  const mockAccounts = [
    { id: '1', provider: 'google', accountName: 'YT Account', isDistributionEnabled: true },
    { id: '2', provider: 'facebook', accountName: 'FB Page', isDistributionEnabled: false },
  ];
  const mockPrefs = [
    { id: 'p1', userId: 'u1', platformId: 'youtube', isEnabled: true },
    { id: 'p2', userId: 'u1', platformId: 'facebook', isEnabled: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userActions.getUserAccounts).mockResolvedValue(mockAccounts as never);
    vi.mocked(userActions.getPlatformPreferences).mockResolvedValue(mockPrefs as never);
  });

  it('fetches accounts and preferences on mount', async () => {
    const { result } = renderHook(() => useAccounts());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      // Wait for useEffect
    });

    expect(result.current.accounts).toEqual(mockAccounts);
    expect(result.current.preferences).toEqual(mockPrefs);
    expect(result.current.isLoading).toBe(false);
  });

  it('supports initial data and skips fetching', async () => {
    const { result } = renderHook(() => useAccounts(mockAccounts as never, mockPrefs as never));

    expect(result.current.accounts).toEqual(mockAccounts);
    expect(result.current.preferences).toEqual(mockPrefs);
    expect(result.current.isLoading).toBe(false);
    expect(userActions.getUserAccounts).not.toHaveBeenCalled();
  });

  it('optimistically updates distribution status', async () => {
    const { result } = renderHook(() => useAccounts(mockAccounts as never, mockPrefs as never));
    vi.mocked(userActions.toggleAccountDistribution).mockResolvedValue({ success: true } as never);

    await act(async () => {
      await result.current.toggleDistribution('facebook', false);
    });

    expect(result.current.accounts.find(a => a.provider === 'facebook')?.isDistributionEnabled).toBe(true);
    expect(userActions.toggleAccountDistribution).toHaveBeenCalledWith('2', true);
  });

  it('rolls back state if distribution update fails', async () => {
    const { result } = renderHook(() => useAccounts(mockAccounts as never, mockPrefs as never));
    vi.mocked(userActions.toggleAccountDistribution).mockRejectedValue(new Error('Update failed'));

    // We expect this to throw because the hook re-throws after rollback
    await expect(act(async () => {
      await result.current.toggleDistribution('facebook', false);
    })).rejects.toThrow('Update failed');

    // Should be back to false
    expect(result.current.accounts.find(a => a.provider === 'facebook')?.isDistributionEnabled).toBe(false);
  });

  it('optimistically disconnects an account', async () => {
    const { result } = renderHook(() => useAccounts(mockAccounts as never, mockPrefs as never));
    vi.mocked(userActions.disconnectAccount).mockResolvedValue({ success: true } as never);

    await act(async () => {
      await result.current.disconnectAccount('1');
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].id).toBe('2');
  });

  it('optimistically toggles platform preference', async () => {
    const { result } = renderHook(() => useAccounts(mockAccounts as never, mockPrefs as never));
    vi.mocked(userActions.togglePlatformPreference).mockResolvedValue({ success: true } as never);

    await act(async () => {
      await result.current.togglePlatform('facebook', false);
    });

    expect(result.current.preferences.find(p => p.platformId === 'facebook')?.isEnabled).toBe(true);
  });
});
