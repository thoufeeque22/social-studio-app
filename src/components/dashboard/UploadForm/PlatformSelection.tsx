import React from 'react';
import Link from 'next/link';
import { Account } from '@/lib/types';
import { formatHandle } from '@/lib/utils';

interface PlatformSelectionProps {
  accounts: Account[];
  selectedAccountIds: string[];
  successfulAccountIds: string[];
  onToggleAccount: (id: string) => void;
}

export const PlatformSelection: React.FC<PlatformSelectionProps> = ({
  accounts,
  selectedAccountIds,
  successfulAccountIds,
  onToggleAccount,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Distribution Channels</label>
        {accounts.length === 0 && (
          <Link href="/settings" style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', textDecoration: 'none' }}>
            Connect an account →
          </Link>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
        {accounts.length > 0 ? (
          accounts.flatMap(account => {
            // Split Facebook/Instagram or show raw platforms
            const items = [];
            if (account.provider === 'facebook') {
              items.push({ id: `facebook:${account.id}`, platform: 'facebook', displayName: formatHandle(account.accountName, 'facebook') });
              items.push({ id: `instagram:${account.id}`, platform: 'instagram', displayName: formatHandle(account.accountName, 'instagram') });
            } else {
              const platform = account.provider === 'google' ? 'youtube' : account.provider;
              items.push({ id: account.id, platform, displayName: formatHandle(account.accountName, platform) });
            }

            return items.map(item => {
              const isSelected = selectedAccountIds.includes(item.id);
              const isSuccess = successfulAccountIds.includes(item.id);
              
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${item.platform}: ${item.displayName}`}
                  onClick={() => onToggleAccount(item.id)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '0.75rem',
                    border: `1px solid ${isSuccess ? '#10B981' : isSelected ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.5)'}`,
                    background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : isSelected ? 'hsla(var(--primary) / 0.15)' : 'hsla(var(--muted) / 0.2)',
                    color: isSuccess ? '#10B981' : isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: isSuccess ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none'
                  }}
                >
                  {isSuccess ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: isSelected ? 'hsl(var(--primary))' : 'transparent',
                      border: isSelected ? 'none' : '1px solid hsla(var(--muted-foreground) / 0.5)'
                    }}></span>
                  )}
                  <span style={{ opacity: 0.7, textTransform: 'capitalize' }}>{item.platform}:</span> {item.displayName}
                </button>
              );
            });
          })
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
            No active platforms found. Please enable them in Settings.
          </p>
        )}
      </div>
      {accounts.length > 0 && selectedAccountIds.length === 0 && (
        <p style={{ fontSize: '0.75rem', color: '#EF4444' }}>Please select at least one account.</p>
      )}
    </div>
  );
};
