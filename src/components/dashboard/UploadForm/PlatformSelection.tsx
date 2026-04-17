import React from 'react';
import Link from 'next/link';
import { Account } from '@/lib/types';
import { formatHandle } from '@/lib/utils';

interface PlatformSelectionProps {
  accounts: Account[];
  selectedAccountIds: string[];
  onToggleAccount: (id: string) => void;
}

export const PlatformSelection: React.FC<PlatformSelectionProps> = ({
  accounts,
  selectedAccountIds,
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
          accounts.map(account => {
            const platform = account.provider === 'google' ? 'youtube' : account.provider;
            const displayName = formatHandle(account.accountName, platform);
            const isSelected = selectedAccountIds.includes(account.id);
            
            return (
              <button
                key={account.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${platform}: ${displayName}`}
                onClick={() => onToggleAccount(account.id)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '0.75rem',
                  border: `1px solid ${isSelected ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.5)'}`,
                  background: isSelected ? 'hsla(var(--primary) / 0.15)' : 'hsla(var(--muted) / 0.2)',
                  color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: isSelected ? 'hsl(var(--primary))' : 'transparent',
                  border: isSelected ? 'none' : '1px solid hsla(var(--muted-foreground) / 0.5)'
                }}></span>
                <span style={{ opacity: 0.7, textTransform: 'capitalize' }}>{platform}:</span> {displayName}
              </button>
            );
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
