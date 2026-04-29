import React from 'react';
import Link from 'next/link';
import { Account, PlatformPreference } from '@/lib/core/types';
import { formatHandle } from '@/lib/utils/utils';

interface PlatformSelectionProps {
  accounts: Account[];
  preferences: PlatformPreference[];
  selectedAccountIds: string[];
  successfulAccountIds: string[];
  platformStatuses: Record<string, 'pending' | 'uploading' | 'processing' | 'success' | 'failed' | 'cancelled'>;
  platformErrors: Record<string, string>;
  onToggleAccount: (id: string) => void;
  onAbort: (id: string) => void;
}

export const PlatformSelection: React.FC<PlatformSelectionProps> = ({
  accounts,
  preferences,
  selectedAccountIds,
  successfulAccountIds,
  platformStatuses,
  platformErrors,
  onToggleAccount,
  onAbort,
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
              const isCancelled = status === 'cancelled';
              
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${item.platform}: ${item.displayName}`}
                  onClick={() => {
                    if (isProcessing || isSuccess) return; // Prevent toggling while uploading or if already successful
                    onToggleAccount(item.id);
                  }}
                  style={{
                    position: 'relative',
                    overflow: 'visible',
                    padding: '0.6rem 1rem',
                    borderRadius: '0.75rem',
                    border: isSuccess 
                      ? '1px solid #10B981' 
                      : isSelected 
                        ? `2px solid ${isFailed ? '#EF4444' : isCancelled ? '#9CA3AF' : 'hsl(var(--primary))'}`
                        : isFailed 
                          ? '1px solid #EF4444' 
                          : isCancelled 
                            ? '1px dashed #6B7280' 
                            : '1px solid hsla(var(--border) / 0.5)',
                    background: isSuccess 
                      ? 'rgba(16, 185, 129, 0.15)' 
                      : isSelected 
                        ? (isFailed ? 'rgba(239, 68, 68, 0.2)' : isCancelled ? 'rgba(107, 114, 128, 0.2)' : 'hsla(var(--primary) / 0.2)')
                        : isFailed 
                          ? 'rgba(239, 68, 68, 0.1)' 
                          : isCancelled 
                            ? 'transparent' 
                            : 'hsla(var(--muted) / 0.2)',
                    color: isSuccess 
                      ? '#10B981' 
                      : isSelected 
                        ? (isFailed ? '#FF6B6B' : isCancelled ? '#D1D5DB' : 'white')
                        : isFailed 
                          ? '#EF4444' 
                          : isCancelled 
                            ? '#6B7280' 
                            : 'hsl(var(--muted-foreground))',
                    cursor: (isProcessing || isSuccess) ? 'default' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: isSelected 
                      ? `0 0 20px ${isFailed ? 'rgba(239, 68, 68, 0.4)' : isCancelled ? 'rgba(107, 114, 128, 0.3)' : 'hsla(var(--primary) / 0.4)'}` 
                      : isSuccess 
                        ? '0 0 12px rgba(16, 185, 129, 0.2)' 
                        : 'none'
                  }}
                >
                  {/* Custom Instant Tooltip */}
                  <div className="custom-tooltip" style={{ 
                    whiteSpace: 'normal', 
                    maxWidth: '250px', 
                    lineHeight: '1.4',
                    textAlign: 'left'
                  }}>
                    {(() => {
                      const err = platformErrors?.[item.id];
                      if (!err) return isSuccess ? 'Successfully posted' : isFailed ? 'Upload failed' : isCancelled ? 'Stopped by user' : 'Click to toggle';
                      
                      let friendly = err;

                      // 1. YouTube Limit
                      if (err.includes('uploadLimitExceeded') || err.includes('exceeded the number of videos')) {
                        return 'YouTube upload limit reached. Try again in 24h.';
                      }

                      // 2. Facebook/Instagram Rate Limit
                      if (err.includes('limit how often you can post') || err.includes('protect the community from spam')) {
                        return 'Platform limit reached. Please try again later.';
                      }

                      // 3. Clean up technical prefixes
                      friendly = friendly.replace(/^Error: /i, '')
                                       .replace(/^Reel Handshake Step \d+ Failed: /i, '')
                                       .replace(/^YT Session Init Failed: /i, '')
                                       .trim();

                      // 4. Try to parse JSON if it's still there
                      try {
                        if (friendly.startsWith('{')) {
                          const parsed = JSON.parse(friendly);
                          friendly = parsed.error?.message || parsed.message || friendly;
                        }
                      } catch (e) { /* ignore */ }

                      // 5. Final cap on length
                      return friendly.length > 80 ? friendly.substring(0, 77) + '...' : friendly;
                    })()}
                  </div>

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
                      animation: 'pulse 1.5s infinite',
                      borderBottomLeftRadius: '0.75rem',
                      borderBottomRightRadius: '0.75rem'
                    }} />
                  )}

                  {isSuccess ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : isProcessing ? (
                     <div className="animate-spin" style={{ width: '10px', height: '10px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  ) : isFailed ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  ) : isCancelled ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
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

                  {isProcessing && (
                    <div 
                      role="button"
                      aria-label="Stop Upload"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAbort(item.id);
                      }}
                      style={{
                        background: '#EF4444',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        cursor: 'pointer',
                        zIndex: 20,
                        marginLeft: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    >
                      ✕
                    </div>
                  )}
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
