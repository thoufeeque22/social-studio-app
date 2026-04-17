"use client";

import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { getUserAccounts, toggleAccountDistribution } from '@/app/actions/user';
import { Account } from '@/lib/types';
import { formatHandle } from '@/lib/utils';
import styles from './Settings.module.css';

const SettingsPage = () => {
  const { data: session } = useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load accounts on mount
  useEffect(() => {
    async function loadSettings() {
      const dbAccounts = await getUserAccounts();
      setAccounts(dbAccounts);
      setIsLoading(false);
    }

    loadSettings();
  }, []);

  const platforms = [
    { id: 'instagram', provider: 'facebook', name: 'Instagram Reels', icon: '📸' },
    { id: 'tiktok', provider: 'tiktok', name: 'TikTok', icon: '🎵' },
    { id: 'youtube', provider: 'google', name: 'YouTube Shorts', icon: '📺' },
    { id: 'facebook', provider: 'facebook', name: 'Facebook', icon: '👥' },
    { id: 'linkedin', provider: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { id: 'twitter', provider: 'twitter', name: 'Twitter/X', icon: '𝕏' },
  ];

  const handlePlatformToggle = async (platformId: string, provider: string, currentStatus: boolean) => {
    const targetAccounts = accounts.filter(a => a.provider === provider);
    
    if (targetAccounts.length === 0) {
      alert(`Please connect a ${platformId} account below before enabling distribution.`);
      return;
    }

    if (platformId === 'tiktok' && currentStatus === false) {
      alert("TikTok distribution is functionally complete, but is temporarily disabled pending TikTok Developer App Audit. \n\nIn Sandbox mode, TikTok strictly requires test accounts to physically be set to 'Private Account' in the mobile app before allowing API uploads. \n\nPlease submit the app for audit to unlock public posting!");
      return; 
    }

    // Optimistic UI update
    setAccounts(prev => prev.map(a => 
      a.provider === provider ? { ...a, isDistributionEnabled: !currentStatus } : a
    ));

    try {
      await Promise.all(
        targetAccounts.map(a => toggleAccountDistribution(a.id, !currentStatus))
      );
    } catch (e) {
      // Rollback on error
      setAccounts(prev => prev.map(a => 
        a.provider === provider ? { ...a, isDistributionEnabled: currentStatus } : a
      ));
      alert('Failed to update settings. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Configure your video distribution and automation preferences.</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span>📡</span> Distribution Destinations
        </h2>
        {isLoading ? (
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.9rem' }}>Loading accounts...</p>
        ) : (
          <div className={styles.grid}>
            {platforms.map((platform) => {
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
                      onChange={() => handlePlatformToggle(platform.id, platform.provider, isEnabled)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span>🎬</span> YouTube Connection
          </h2>
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
                  Add YouTube Account
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                  Connect another Google account to expand your reach.
                </p>
              </div>
              <button 
                onClick={() => signIn('google')}
                style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px hsla(var(--primary) / 0.2)' }}
              >
                Connect Channel
              </button>
            </div>
            
            {accounts.filter(a => a.provider === 'google').length > 0 && (
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid hsla(var(--border)/0.5)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>Connected Channels:</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {accounts.filter(a => a.provider === 'google').map(acc => (
                    <span key={acc.id} style={{ background: 'hsla(var(--primary)/0.1)', color: 'hsl(var(--primary))', padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 500 }}>
                      {formatHandle(acc.accountName, 'YouTube Account')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span>📸</span> Instagram Connection
          </h2>
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
                  Instagram Reels
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                  Connect your Facebook account to manage Instagram Business Reels.
                </p>
              </div>
              <button 
                onClick={() => signIn('facebook')}
                style={{ background: '#E1306C', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px hsla(340, 75%, 54%, 0.2)' }}
              >
                Connect Instagram
              </button>
            </div>

            {/* Note: Instagram uses facebook provider in DB */}
            {accounts.filter(a => a.provider === 'facebook').length > 0 && (
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid hsla(var(--border)/0.5)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>Connected Accounts:</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {accounts.filter(a => a.provider === 'facebook').map(acc => (
                    <span key={acc.id} style={{ background: 'hsla(340, 75%, 54%, 0.1)', color: '#E1306C', padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 500 }}>
                      {formatHandle(acc.accountName, 'Instagram Account')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span>👥</span> Facebook Connection
          </h2>
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
                  Facebook Page
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                  Connect your Facebook account to post directly to your Facebook Pages.
                </p>
              </div>
              <button 
                onClick={() => signIn('facebook')}
                style={{ background: '#1877F2', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px hsla(214, 89%, 52%, 0.2)' }}
              >
                Connect Facebook
              </button>
            </div>

            {accounts.filter(a => a.provider === 'facebook').length > 0 && (
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid hsla(var(--border)/0.5)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>Connected Accounts:</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {accounts.filter(a => a.provider === 'facebook').map(acc => (
                    <span key={acc.id} style={{ background: 'hsla(214, 89%, 52%, 0.1)', color: '#1877F2', padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 500 }}>
                      {formatHandle(acc.accountName, 'Facebook Account')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span>🎵</span> TikTok Connection
          </h2>
          <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
                  TikTok Platform
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                  Connect your TikTok account to publish videos automatically.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => signIn('tiktok')}
                  style={{ background: 'black', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                >
                  Connect TikTok
                </button>
              </div>
            </div>

            {accounts.filter(a => a.provider === 'tiktok').length > 0 && (
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid hsla(var(--border)/0.5)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'hsl(var(--muted-foreground))' }}>Connected Profiles:</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {accounts.filter(a => a.provider === 'tiktok').map(acc => (
                    <span key={acc.id} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 500 }}>
                      {formatHandle(acc.accountName, 'TikTok Profile')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
