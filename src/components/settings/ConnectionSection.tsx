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
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <span>{icon}</span> {title}
      </h2>
      <GlassCard style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
              Add {title} Account
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
              {subtitle}
            </p>
          </div>
          <button 
            onClick={onConnect}
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
        </div>
        
        {platformAccounts.length > 0 && (
          <div style={{ marginTop: '0.5rem', borderTop: '1px solid hsla(var(--border)/0.5)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>Connected:</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {platformAccounts.map(acc => (
                <div 
                  key={acc.id} 
                  style={{ 
                    background: `${color}1A`, 
                    color: color === 'white' ? 'white' : color, 
                    padding: '0.4rem 0.6rem 0.4rem 0.8rem', 
                    borderRadius: '2rem', 
                    fontSize: '0.8rem', 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    border: color === 'white' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span>{formatHandle(acc.accountName, platformLabel)}</span>
                  <button
                    onClick={() => onDisconnect(acc.id)}
                    title="Disconnect account"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                      borderRadius: '50%',
                      opacity: 0.6,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.6';
                      e.currentTarget.style.background = 'none';
                    }}
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
      </GlassCard>
    </section>
  );
};
