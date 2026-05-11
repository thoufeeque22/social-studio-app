import { useState, useEffect } from 'react';
import { Account, PlatformPreference } from '@/lib/core/types';

export function usePlatformSelection(
  accounts: Account[], 
  preferences: PlatformPreference[], 
  isLoading: boolean
) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isInitialSync, setIsInitialSync] = useState(false);

  // Helper to calculate initial selection
  const calculateInitialSelection = (accounts: Account[], preferences: PlatformPreference[]) => {
    const isPlatformEnabled = (platformId: string) => {
      const pref = preferences.find(p => p.platformId === platformId);
      return pref ? pref.isEnabled : true;
    };

    const selection: string[] = [];
    accounts.forEach(account => {
      if (!account.isDistributionEnabled) return;

      if (account.provider === 'facebook') {
        if (isPlatformEnabled('facebook')) selection.push(`facebook:${account.id}`);
        if (isPlatformEnabled('instagram')) selection.push(`instagram:${account.id}`);
      } else {
        const platform = account.provider === 'google' ? 'youtube' : account.provider;
        if (isPlatformEnabled(platform)) selection.push(account.id);
      }
    });
    return selection;
  };

  // Initial Sync Logic
  useEffect(() => {
    if (isLoading || isInitialSync) return;

    const stickySelection = localStorage.getItem('SS_SELECTED_PLATFORMS');
    let parsedSelection: string[] | null = null;

    if (stickySelection) {
      try {
        const parsed = JSON.parse(stickySelection);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedSelection = parsed;
        }
      } catch (e) { console.error(e); }
    }

    const timer = setTimeout(() => {
      if (parsedSelection) {
        setSelectedAccountIds(parsedSelection);
        setIsInitialSync(true);
      } else if (accounts.length > 0) {
        const initialSelection = calculateInitialSelection(accounts, preferences);
        setSelectedAccountIds(initialSelection);
        setIsInitialSync(true);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [accounts, isInitialSync, preferences, isLoading]);

  // Persist Sticky Selection
  useEffect(() => {
    if (isInitialSync) {
      localStorage.setItem('SS_SELECTED_PLATFORMS', JSON.stringify(selectedAccountIds));
    }
  }, [selectedAccountIds, isInitialSync]);

  const handleToggleAccount = (id: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  return {
    selectedAccountIds,
    setSelectedAccountIds,
    handleToggleAccount,
    isInitialSync,
    setIsInitialSync
  };
}
