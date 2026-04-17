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
              boxShadow: `0 4px 12px ${color === 'black' ? 'rgba(0,0,0,0.2)' : color + '33'}` 
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
                <span 
                  key={acc.id} 
                  style={{ 
                    background: `${color}1A`, 
                    color: color === 'white' ? 'white' : color, 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '2rem', 
                    fontSize: '0.8rem', 
                    fontWeight: 500,
                    border: color === 'white' ? '1px solid rgba(255,255,255,0.2)' : 'none'
                  }}
                >
                  {formatHandle(acc.accountName, platformLabel)}
                </span>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </section>
  );
};
