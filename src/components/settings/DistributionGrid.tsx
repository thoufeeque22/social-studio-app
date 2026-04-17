import React from 'react';
import styles from '@/app/settings/Settings.module.css';
import { Account } from '@/lib/types';
import { PLATFORMS } from '@/lib/constants';

interface DistributionGridProps {
  accounts: Account[];
  isLoading: boolean;
  onToggle: (platformId: string, provider: string, currentStatus: boolean) => Promise<void>;
}

export const DistributionGrid: React.FC<DistributionGridProps> = ({ accounts, isLoading, onToggle }) => {
  if (isLoading) {
    return <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>Loading accounts...</p>;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <span>📡</span> Distribution Destinations
      </h2>
      <div className={styles.grid}>
        {PLATFORMS.map((platform) => {
          const platformAccounts = accounts.filter(a => a.provider === platform.provider);
          const isEnabled = platformAccounts.length > 0 && platformAccounts.some(a => a.isDistributionEnabled);
          
          return (
            <div key={platform.id} className={styles.platformCard}>
              <div className={styles.platformInfo}>
                <div className={styles.platformIcon}>{platform.icon}</div>
                <div>
                  <div className={styles.platformName}>{platform.name}</div>
                  <div className={styles.platformStatus}>
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
              <label className={styles.switch} htmlFor={`switch-${platform.id}`}>
                <input 
                  id={`switch-${platform.id}`}
                  type="checkbox" 
                  aria-label={`Toggle ${platform.name} distribution`}
                  checked={isEnabled}
                  onChange={() => onToggle(platform.id, platform.provider, isEnabled)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
};
