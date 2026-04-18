import { useState, useEffect, useCallback } from 'react';
import { Account } from '@/lib/types';
import { getUserAccounts, toggleAccountDistribution, disconnectAccount } from '@/app/actions/user';

/**
 * Custom hook to fetch a list of user accounts and manage the state
 * of their distribution status with optimistic updates.
 */
export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      try {
        setIsLoading(true);
        const data = await getUserAccounts();
        setAccounts(data);
      } catch (error) {
        console.error("Failed to fetch user accounts:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadAccounts();
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

  return {
    accounts,
    setAccounts,
    isLoading,
    toggleDistribution,
    disconnectAccount: useCallback(async (accountId: string): Promise<void> => {
      const originalAccounts = [...accounts];

      // 1. Optimistic Update
      setAccounts(prev => prev.filter(a => a.id !== accountId));

      try {
        // 2. Execute server action
        await disconnectAccount(accountId);
      } catch (error) {
        // 3. Rollback on error
        console.error("Error disconnecting account. Rolling back state.", error);
        setAccounts(originalAccounts);
        throw error;
      }
    }, [accounts]),
  };
};
