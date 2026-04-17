"use client";

import React from 'react';
import { signIn } from 'next-auth/react';
import { useAccounts } from '@/hooks/useAccounts';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { DistributionGrid } from '@/components/settings/DistributionGrid';
import { ConnectionSection } from '@/components/settings/ConnectionSection';
import { PLATFORMS } from '@/lib/constants';
import styles from './Settings.module.css';

const SettingsPage = () => {
  const { accounts, isLoading, toggleDistribution } = useAccounts();

  const handlePlatformToggle = async (platformId: string, provider: string, currentStatus: boolean) => {
    // Platform-specific validation logic (could be moved to a validator util later)
    if (accounts.filter(a => a.provider === provider).length === 0) {
      alert(`Please connect a ${platformId} account below before enabling distribution.`);
      return;
    }

    if (platformId === 'tiktok' && currentStatus === false) {
      alert("TikTok distribution is functionally complete, but is temporarily disabled pending TikTok Developer App Audit. \n\nIn Sandbox mode, TikTok strictly requires test accounts to physically be set to 'Private Account' in the mobile app before allowing API uploads. \n\nPlease submit the app for audit to unlock public posting!");
      return; 
    }

    try {
      await toggleDistribution(provider, currentStatus);
    } catch (e) {
      alert('Failed to update settings. Please try again.');
    }
  };

  return (
    <div className={styles.container}>
      <SettingsHeader 
        title="Settings" 
        subtitle="Configure your video distribution and automation preferences." 
      />

      <DistributionGrid 
        accounts={accounts} 
        isLoading={isLoading} 
        onToggle={handlePlatformToggle} 
      />

      <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <ConnectionSection
          title="YouTube"
          subtitle="Connect another Google account to expand your reach."
          icon="🎬"
          provider="google"
          color="hsl(var(--primary))"
          onConnect={() => signIn('google')}
          accounts={accounts}
          platformLabel="YouTube Channel"
        />

        <ConnectionSection
          title="Instagram"
          subtitle="Connect your Facebook account to manage Instagram Business Reels."
          icon="📸"
          provider="facebook"
          color="#E1306C"
          onConnect={() => signIn('facebook')}
          accounts={accounts}
          platformLabel="Instagram Account"
        />

        <ConnectionSection
          title="Facebook"
          subtitle="Connect your Facebook account to post directly to your Facebook Pages."
          icon="👥"
          provider="facebook"
          color="#1877F2"
          onConnect={() => signIn('facebook')}
          accounts={accounts}
          platformLabel="Facebook Account"
        />

        <ConnectionSection
          title="TikTok"
          subtitle="Connect your TikTok account to publish videos automatically."
          icon="🎵"
          provider="tiktok"
          color="black"
          onConnect={() => signIn('tiktok')}
          accounts={accounts}
          platformLabel="TikTok Profile"
        />
      </div>
    </div>
  );
};

export default SettingsPage;
