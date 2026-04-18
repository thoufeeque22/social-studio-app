import React from 'react';
import styles from '@/app/settings/Settings.module.css';
import { Account, PlatformPreference } from '@/lib/types';
import { PLATFORMS } from '@/lib/constants';

interface DistributionGridProps {
  accounts: Account[];
  preferences: PlatformPreference[];
  isLoading: boolean;
  onToggle: (platformId: string, provider: string, currentStatus: boolean) => Promise<void>;
}

export const DistributionGrid: React.FC<DistributionGridProps> = ({ accounts, preferences, isLoading, onToggle }) => {
  if (isLoading) {
    return <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>Loading settings...</p>;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <span>📡</span> Distribution Destinations
      </h2>
      <div className={styles.grid}>
        {PLATFORMS.map((platform) => {
          // Check if this platform is enabled in the user preferences
          const pref = preferences.find(p => p.platformId === platform.id);
          const isEnabled = pref ? pref.isEnabled : false;
          
          return (
            <div key={platform.id} className={styles.platformCard}>
              <div className={styles.platformInfo}>
                <div className={styles.platformIcon}>{platform.icon}</div>
                <div>
                  <div className={styles.platformName}>{platform.name}</div>
                  <div className={styles.platformStatus}>
                    {isEnabled ? 'Active' : 'Hidden'}
                  </div>
                </div>
              </div>
              <label className={styles.switch} htmlFor={`switch-${platform.id}`}>
                <input 
                  id={`switch-${platform.id}`}
                  type="checkbox" 
                  aria-label={`Toggle ${platform.name} visibility`}
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
