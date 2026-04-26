import React from 'react';
import Link from 'next/link';
import { Account, PlatformPreference } from '@/lib/core/types';
import { formatHandle } from '@/lib/utils/utils';

interface PlatformSelectionProps {
  accounts: Account[];
  preferences: PlatformPreference[];
  selectedAccountIds: string[];
  successfulAccountIds: string[];
  platformStatuses: Record<string, 'pending' | 'uploading' | 'processing' | 'success' | 'failed'>;
  onToggleAccount: (id: string) => void;
}

export const PlatformSelection: React.FC<PlatformSelectionProps> = ({
  accounts,
  preferences,
  selectedAccountIds,
  successfulAccountIds,
  platformStatuses,
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
            // Split Facebook/Instagram or show raw platforms
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
              const isSuccess = successfulAccountIds.includes(item.id);
              const status = platformStatuses[item.id] || (isSuccess ? 'success' : 'pending');
              const isProcessing = status === 'uploading' || status === 'processing';
              const isFailed = status === 'failed';
              
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${item.platform}: ${item.displayName}`}
                  onClick={() => onToggleAccount(item.id)}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    padding: '0.6rem 1rem',
                    borderRadius: '0.75rem',
                    border: `1px solid ${isSuccess ? '#10B981' : isFailed ? '#EF4444' : isSelected ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.5)'}`,
                    background: isSuccess ? 'rgba(16, 185, 129, 0.1)' : isFailed ? 'rgba(239, 68, 68, 0.1)' : isSelected ? 'hsla(var(--primary) / 0.15)' : 'hsla(var(--muted) / 0.2)',
                    color: isSuccess ? '#10B981' : isFailed ? '#EF4444' : isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
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
                  {/* Progress Strip */}
                  {isProcessing && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      height: '3px',
                      background: 'hsl(var(--primary))',
                      width: status === 'uploading' ? '40%' : '85%',
                      transition: 'width 2s ease-in-out',
                      animation: 'pulse 1.5s infinite'
                    }} />
                  )}

                  {isSuccess ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : isProcessing ? (
                     <div className="animate-spin" style={{ width: '10px', height: '10px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  ) : isFailed ? (
                    <span style={{ fontSize: '10px' }}>❌</span>
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'hsla(var(--primary) / 0.15)';
            e.currentTarget.style.borderColor = 'hsla(var(--primary) / 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'hsla(var(--primary) / 0.1)';
            e.currentTarget.style.borderColor = 'hsla(var(--primary) / 0.2)';
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
