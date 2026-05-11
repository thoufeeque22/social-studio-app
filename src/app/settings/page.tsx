"use client";

import React from 'react';
import { signIn } from 'next-auth/react';
import { useAccounts } from '@/hooks/useAccounts';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { DistributionGrid } from '@/components/settings/DistributionGrid';
import { ConnectionSection } from '@/components/settings/ConnectionSection';
import { TemplateManager } from '@/components/settings/TemplateManager';
import { PLATFORMS } from '@/lib/core/constants';
import styles from './Settings.module.css';

import BookmarkIcon from '@mui/icons-material/Bookmark';
import LinkIcon from '@mui/icons-material/Link';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import XIcon from '@mui/icons-material/X';

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
          <BookmarkIcon sx={{ fontSize: 24, marginRight: '8px', verticalAlign: 'middle' }} /> Reusable Snippets
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
          Manage your saved descriptions, credits, and links for quick insertion.
        </p>
        <TemplateManager />
      </section>

      <section className={styles.section} style={{ marginTop: '3rem' }}>
        <h2 className={styles.sectionTitle}>
          <LinkIcon sx={{ fontSize: 24, marginRight: '8px', verticalAlign: 'middle' }} /> Platform Connections
        </h2>
        <div className={styles.connectionsGrid}>
          {isPlatformEnabled('youtube') && (
            <ConnectionSection
              title="YouTube"
              subtitle="Connect your Google account."
              icon={<YouTubeIcon sx={{ color: '#FF0000' }} />}
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
              icon={<InstagramIcon sx={{ color: '#E4405F' }} />}
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
              icon={<FacebookIcon sx={{ color: '#1877F2' }} />}
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
              icon={<MusicNoteIcon sx={{ color: '#000000' }} />}
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
              icon={<BusinessCenterIcon sx={{ color: '#0A66C2' }} />}
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
              icon={<XIcon sx={{ color: '#000000' }} />}
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
