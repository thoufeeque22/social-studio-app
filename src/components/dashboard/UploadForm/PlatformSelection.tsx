import React from 'react';
import Link from 'next/link';
import { Account, PlatformPreference } from '@/lib/core/types';
import { formatHandle } from '@/lib/utils/utils';

interface PlatformSelectionProps {
  accounts: Account[];
  preferences: PlatformPreference[];
  selectedAccountIds: string[];
  onToggleAccount: (id: string) => void;
}

export const PlatformSelection: React.FC<PlatformSelectionProps> = ({
  accounts,
  preferences,
  selectedAccountIds,
  onToggleAccount,
}) => {
  // Helper to check if a platform is enabled globally
  const isPlatformEnabled = (platformId: string) => {
    const pref = preferences.find(p => p.platformId === platformId);
    return pref ? pref.isEnabled : true; // Default to true if not explicitly set
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Distribution Channels</label>
      </div>
      
      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
        {accounts.length > 0 ? (
          accounts.flatMap(account => {
            const items = [];
            if (account.provider === 'facebook') {
              items.push({ id: `facebook:${account.id}`, platform: 'facebook', displayName: formatHandle(account.accountName, 'facebook') });
              items.push({ id: `instagram:${account.id}`, platform: 'instagram', displayName: formatHandle(account.accountName, 'instagram') });
            } else {
              const platform = account.provider === 'google' ? 'youtube' : account.provider;
              items.push({ id: account.id, platform, displayName: formatHandle(account.accountName, platform) });
            }

            return items
              .filter(item => isPlatformEnabled(item.platform))
              .map(item => {
              const isSelected = selectedAccountIds.includes(item.id);
              
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${item.platform}: ${item.displayName}`}
                  onClick={() => onToggleAccount(item.id)}
                  style={{
                    position: 'relative',
                    padding: '0.6rem 1rem',
                    borderRadius: '0.75rem',
                    border: isSelected 
                      ? `2px solid hsl(var(--primary))`
                      : '1px solid hsla(var(--border) / 0.5)',
                    background: isSelected 
                      ? 'hsla(var(--primary) / 0.2)'
                      : 'hsla(var(--muted) / 0.2)',
                    color: isSelected 
                      ? 'white'
                      : 'hsl(var(--muted-foreground))',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: isSelected 
                      ? `0 0 20px hsla(var(--primary) / 0.4)` 
                      : 'none'
                  }}
                >
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: isSelected ? 'hsl(var(--primary))' : 'transparent',
                    border: isSelected ? 'none' : '1px solid hsla(var(--muted-foreground) / 0.5)'
                  }}></span>
                  <span style={{ opacity: 0.7, textTransform: 'capitalize' }}>{item.platform}:</span> {item.displayName}
                </button>
              );
            });
          })
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic', margin: 0 }}>
            No active platforms found.
          </p>
        )}
        <Link 
          href="/settings" 
          style={{ 
            fontSize: '0.8rem', 
            color: 'hsl(var(--primary))', 
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.6rem 1rem',
            borderRadius: '0.75rem',
            background: 'hsla(var(--primary) / 0.1)',
            border: '1px solid hsla(var(--primary) / 0.2)',
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
        >
          {accounts.length > 0 ? '⚙️ Manage Channels' : '➕ Connect Account'}
        </Link>
      </div>
      {accounts.length > 0 && selectedAccountIds.length === 0 && (
        <p style={{ fontSize: '0.75rem', color: '#EF4444' }}>Please select at least one account.</p>
      )}
    </div>
  );
};
