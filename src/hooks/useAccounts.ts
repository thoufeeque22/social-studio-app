import { useState, useEffect, useCallback } from 'react';
import { getUserAccounts, toggleAccountDistribution, disconnectAccount as disconnectAccountAction, getPlatformPreferences, togglePlatformPreference as togglePlatformPreferenceAction } from '@/app/actions/user';
import { Account, PlatformPreference } from '@/lib/types';

/**
 * Custom hook to fetch a list of user accounts and manage the state
 * of their distribution status with optimistic updates.
 */
export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [preferences, setPreferences] = useState<PlatformPreference[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch accounts on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [accountsData, prefsData] = await Promise.all([
          getUserAccounts(),
          getPlatformPreferences()
        ]);
        setAccounts(accountsData);
        setPreferences(prefsData);
      } catch (error) {
        console.error("Failed to fetch user accounts or preferences:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  /**
   * Toggles the distribution status for all accounts belonging to a specific provider.
   * Optimistically updates the local state before calling the server actions.
   */
  const toggleDistribution = useCallback(async (provider: string, currentStatus: boolean): Promise<void> => {
    const newStatus = !currentStatus;

    // 1. Optimistic Update
    setAccounts(prevAccounts => 
      prevAccounts.map(a => 
        a.provider === provider ? { ...a, isDistributionEnabled: newStatus } : a
      )
    );

    // Identify the accounts that need updating
    const targetAccounts = accounts.filter(a => a.provider === provider);

    try {
      // 2. Execute server actions concurrently
      await Promise.all(
        targetAccounts.map(a => toggleAccountDistribution(a.id, newStatus))
      );
    } catch (error) {
      // 3. Rollback on error
      console.error("Error updating account distribution. Rolling back state.", error);
      setAccounts(prevAccounts => 
        prevAccounts.map(a => 
          a.provider === provider ? { ...a, isDistributionEnabled: currentStatus } : a
        )
      );
      throw error;
    }
  }, [accounts]);

  const disconnectAccount = useCallback(async (accountId: string): Promise<void> => {
    const originalAccounts = [...accounts];

    // 1. Optimistic Update
    setAccounts(prev => prev.filter(a => a.id !== accountId));

    try {
      // 2. Execute server action
      await disconnectAccountAction(accountId);
    } catch (error) {
      // 3. Rollback on error
      console.error("Error disconnecting account. Rolling back state.", error);
      setAccounts(originalAccounts);
      throw error;
    }
  }, [accounts]);

  const togglePlatform = useCallback(async (platformId: string, currentStatus: boolean): Promise<void> => {
    const newStatus = !currentStatus;

    // 1. Optimistic Update
    setPreferences(prev => {
      const existing = prev.find(p => p.platformId === platformId);
      if (existing) {
        return prev.map(p => p.platformId === platformId ? { ...p, isEnabled: newStatus } : p);
      } else {
        return [...prev, { id: 'temp', userId: 'temp', platformId, isEnabled: newStatus }];
      }
    });

    try {
      // 2. Execute server action
      await togglePlatformPreferenceAction(platformId, newStatus);
    } catch (error) {
      // 3. Rollback
      console.error("Error toggling platform preference. Rolling back state.", error);
      setPreferences(prev => prev.map(p => p.platformId === platformId ? { ...p, isEnabled: currentStatus } : p));
      throw error;
    }
  }, []);

  return {
    accounts,
    setAccounts,
    isLoading,
    toggleDistribution,
    preferences,
    togglePlatform,
    disconnectAccount,
  };
};
