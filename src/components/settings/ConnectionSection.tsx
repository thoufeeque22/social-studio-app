import React from 'react';
import styles from '@/app/settings/Settings.module.css';
import { Account } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatHandle } from '@/lib/utils';

interface ConnectionSectionProps {
  title: string;
  subtitle: string;
  icon: string;
  provider: string;
  color: string;
  onConnect: () => void;
  onDisconnect: (accountId: string) => void;
  accounts: Account[];
  platformLabel: string; // e.g. "YouTube Channel"
}

export const ConnectionSection: React.FC<ConnectionSectionProps> = ({
  title,
  subtitle,
  icon,
  provider,
  color,
  onConnect,
  onDisconnect,
  accounts,
  platformLabel
}) => {
  const platformAccounts = accounts.filter(a => a.provider === provider);

  return (
    <GlassCard style={{ padding: '1.5rem' }}>
      <div className={styles.connectionCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleSection}>
            <div className={styles.platformIcon} style={{ marginBottom: '0.5rem' }}>{icon}</div>
            <h3 className={styles.cardTitle}>{title}</h3>
            <p className={styles.cardSubtitle}>{subtitle}</p>
          </div>
        </div>

        <div>
          <button 
            onClick={onConnect}
            className={styles.connectBtn}
            style={{ 
              background: color, 
              color: 'white', 
              border: 'none', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '0.5rem', 
              cursor: 'pointer', 
              fontWeight: 600, 
              transition: 'all 0.2s ease',
              boxShadow: `0 4px 12px ${color === 'black' ? 'rgba(0,0,0,0.2)' : color + '33'}` 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 6px 16px ${color === 'black' ? 'rgba(0,0,0,0.3)' : color + '4D'}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${color === 'black' ? 'rgba(0,0,0,0.2)' : color + '33'}`;
            }}
          >
            Connect Account
          </button>

          {platformAccounts.length > 0 && (
            <div className={styles.connectedList}>
              <p className={styles.connectedTitle}>Connected:</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {platformAccounts.map(acc => (
                  <div 
                    key={acc.id} 
                    className={styles.handlePill}
                    style={{ 
                      background: `${color}1A`, 
                      color: color === 'white' ? 'white' : color, 
                      border: color === 'white' ? '1px solid rgba(255,255,255,0.2)' : `1px solid ${color}33`,
                    }}
                  >
                    <span>{formatHandle(acc.accountName, platformLabel)}</span>
                    <button
                      onClick={() => onDisconnect(acc.id)}
                      title="Disconnect account"
                      className={styles.removeBtn}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
