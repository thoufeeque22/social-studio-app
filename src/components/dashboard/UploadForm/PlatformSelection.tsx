import React from 'react';
import Link from 'next/link';
import { Account, PlatformPreference } from '@/lib/core/types';
import { formatHandle } from '@/lib/utils/utils';

interface PlatformSelectionProps {
  accounts: Account[];
  preferences: PlatformPreference[];
  selectedAccountIds: string[];
  successfulAccountIds?: string[];
  platformStatuses?: Record<string, 'pending' | 'uploading' | 'processing' | 'success' | 'failed' | 'cancelled'>;
  platformErrors?: Record<string, string>;
  onToggleAccount: (id: string) => void;
}

export const PlatformSelection: React.FC<PlatformSelectionProps> = ({
  accounts,
  preferences,
  selectedAccountIds,
  successfulAccountIds = [],
  platformStatuses = {},
  platformErrors = {},
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
              const status = platformStatuses[item.id];
              const isSuccess = successfulAccountIds.includes(item.id) || status === 'success';
              const isFailed = status === 'failed';
              const isUploading = status === 'uploading' || status === 'processing';
              const isCancelled = status === 'cancelled';
              
              return (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${item.platform}: ${item.displayName}`}
                    onClick={() => onToggleAccount(item.id)}
                    disabled={isUploading || isSuccess}
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
                      cursor: (isUploading || isSuccess) ? 'not-allowed' : 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: isSelected && !isUploading && !isSuccess
                        ? `0 0 20px hsla(var(--primary) / 0.4)` 
                        : 'none',
                      opacity: isCancelled ? 0.5 : 1,
                      overflow: 'hidden'
                    }}
                  >
                    {isUploading && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, height: '4px', background: 'hsl(var(--primary))', width: '40%', transition: 'width 0.3s' }}></div>
                    )}
                    
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: isSelected ? 'hsl(var(--primary))' : 'transparent',
                      border: isSelected ? 'none' : '1px solid hsla(var(--muted-foreground) / 0.5)'
                    }}></span>
                    <span style={{ opacity: 0.7, textTransform: 'capitalize' }}>{item.platform}:</span> {item.displayName}

                    {isUploading && (
                      <span className="animate-spin" style={{ marginLeft: 'auto', display: 'inline-block', width: '12px', height: '12px', border: '2px solid hsla(var(--primary)/0.3)', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }}></span>
                    )}
                    {isSuccess && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px', marginLeft: 'auto' }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                    {isFailed && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '14px', height: '14px', marginLeft: 'auto' }}>
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    )}
                  </button>
                  {isFailed && platformErrors[item.id] && (
                    <span style={{ fontSize: '0.65rem', color: '#EF4444', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {platformErrors[item.id]}
                    </span>
                  )}
                </div>
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
