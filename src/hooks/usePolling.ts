'use client';

import { useEffect, useRef } from 'react';

interface UsePollingOptions {
  callback: () => void;
  interval: number;
  isActive: boolean;
}

/**
 * A hook that executes a callback at a specified interval.
 * Automatically pauses when the tab/window is not visible.
 */
export function usePolling({ callback, interval, isActive }: UsePollingOptions) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!isActive) return;

    let intervalId: NodeJS.Timeout;

    const tick = () => {
      savedCallback.current();
    };

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(tick, interval);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined as any;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };

    // Initial check and start
    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [interval, isActive]);
}
