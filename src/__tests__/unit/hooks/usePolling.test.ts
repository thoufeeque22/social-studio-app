/**
 * USE POLLING HOOK TESTS
 * Verifies the behavior of the usePolling custom hook.
 * Tests include:
 * - Interval execution of callbacks.
 * - Automatic pausing when the document is hidden.
 * - Resumption when the document becomes visible.
 * - Cleanup on component unmount.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePolling } from '@/hooks/usePolling';

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock document.hidden
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('calls the callback at the specified interval when active', () => {
    const callback = vi.fn();
    renderHook(() => usePolling({ callback, interval: 1000, isActive: true }));

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('does not call the callback when inactive', () => {
    const callback = vi.fn();
    renderHook(() => usePolling({ callback, interval: 1000, isActive: false }));

    vi.advanceTimersByTime(3000);
    expect(callback).not.toHaveBeenCalled();
  });

  it('stops polling when the document becomes hidden', () => {
    const callback = vi.fn();
    renderHook(() => usePolling({ callback, interval: 1000, isActive: true }));

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Simulate hiding the tab
    Object.defineProperty(document, 'hidden', { value: true });
    document.dispatchEvent(new Event('visibilitychange'));

    vi.advanceTimersByTime(2000);
    expect(callback).toHaveBeenCalledTimes(1); // Still 1
  });

  it('resumes polling when the document becomes visible', () => {
    const callback = vi.fn();
    renderHook(() => usePolling({ callback, interval: 1000, isActive: true }));

    // Hide
    Object.defineProperty(document, 'hidden', { value: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Show
    Object.defineProperty(document, 'hidden', { value: false });
    document.dispatchEvent(new Event('visibilitychange'));

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cleans up the interval on unmount', () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => usePolling({ callback, interval: 1000, isActive: true }));

    unmount();

    vi.advanceTimersByTime(3000);
    expect(callback).not.toHaveBeenCalled();
  });
});
