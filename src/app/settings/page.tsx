"use client";

import React from 'react';
import { signIn } from 'next-auth/react';
import { useAccounts } from '@/hooks/useAccounts';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { DistributionGrid } from '@/components/settings/DistributionGrid';
import { ConnectionSection } from '@/components/settings/ConnectionSection';
import { PLATFORMS } from '@/lib/core/constants';
import styles from './Settings.module.css';

const SettingsPage = () => {
  const { accounts, preferences, isLoading, togglePlatform, disconnectAccount } = useAccounts();

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    
    try {
      await disconnectAccount(accountId);
    } catch (e) {
      alert('Failed to disconnect account. Please try again.');
    }
  };

  const handlePlatformToggle = async (platformId: string, provider: string, currentStatus: boolean) => {
    try {
      if (platformId === 'tiktok' && currentStatus === false) {
        alert("TikTok distribution is functionally complete, but is temporarily disabled pending TikTok Developer App Audit. \n\nIn Sandbox mode, TikTok strictly requires test accounts to physically be set to 'Private Account' in the mobile app before allowing API uploads. \n\nPlease submit the app for audit to unlock public posting!");
        return; 
      }
      await togglePlatform(platformId, currentStatus);
    } catch (e) {
      alert('Failed to update settings. Please try again.');
    }
  };

  const isPlatformEnabled = (platformId: string) => {
    return preferences.some(p => p.platformId === platformId && p.isEnabled);
  };

  return (
    <div className={styles.container}>
      <SettingsHeader 
        title="Settings" 
        subtitle="Configure your video distribution and automation preferences." 
      />

      <DistributionGrid 
        accounts={accounts} 
        preferences={preferences}
        isLoading={isLoading} 
        onToggle={handlePlatformToggle} 
      />

      <section className={styles.section} style={{ marginTop: '3rem' }}>
        <h2 className={styles.sectionTitle}>
          <span>🔗</span> Platform Connections
        </h2>
        <div className={styles.connectionsGrid}>
          {isPlatformEnabled('youtube') && (
            <ConnectionSection
              title="YouTube"
              subtitle="Connect your Google account."
              icon="📺"
              provider="google"
              color="hsl(var(--primary))"
              onConnect={() => signIn('google')}
              onDisconnect={handleDisconnect}
              accounts={accounts}
              platformLabel="YouTube Channel"
            />
          )}

          {isPlatformEnabled('instagram') && (
            <ConnectionSection
              title="Instagram"
              subtitle="Connect your Facebook account."
              icon="📸"
              provider="facebook"
              color="#E1306C"
              onConnect={() => signIn('facebook')}
              onDisconnect={handleDisconnect}
              accounts={accounts}
              platformLabel="Instagram Account"
            />
          )}

          {isPlatformEnabled('facebook') && (
            <ConnectionSection
              title="Facebook"
              subtitle="Post directly to your Pages."
              icon="👥"
              provider="facebook"
              color="#1877F2"
              onConnect={() => signIn('facebook')}
              onDisconnect={handleDisconnect}
              accounts={accounts}
              platformLabel="Facebook Account"
            />
          )}

          {isPlatformEnabled('tiktok') && (
            <ConnectionSection
              title="TikTok"
              subtitle="Publish videos automatically."
              icon="🎵"
              provider="tiktok"
              color="black"
              onConnect={() => signIn('tiktok')}
              onDisconnect={handleDisconnect}
              accounts={accounts}
              platformLabel="TikTok Profile"
            />
          )}

          {isPlatformEnabled('linkedin') && (
            <ConnectionSection
              title="LinkedIn"
              subtitle="Share to your network."
              icon="💼"
              provider="linkedin"
              color="#0A66C2"
              onConnect={() => signIn('linkedin')}
              onDisconnect={handleDisconnect}
              accounts={accounts}
              platformLabel="LinkedIn Profile"
            />
          )}

          {isPlatformEnabled('twitter') && (
            <ConnectionSection
              title="Twitter/X"
              subtitle="Share with your followers."
              icon="𝕏"
              provider="twitter"
              color="black"
              onConnect={() => signIn('twitter')}
              onDisconnect={handleDisconnect}
              accounts={accounts}
              platformLabel="Twitter Account"
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
