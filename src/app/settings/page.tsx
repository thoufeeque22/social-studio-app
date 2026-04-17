"use client";

import React, { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { getUserPlatforms, updateUserPlatforms } from '@/app/actions/user';
import styles from './Settings.module.css';

interface Platform {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

const SettingsPage = () => {
  const { data: session, update } = useSession();
  const [platforms, setPlatforms] = useState<Platform[]>([
    { id: 'instagram', name: 'Instagram Reels', icon: '📸', enabled: false },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', enabled: false },
    { id: 'youtube', name: 'YouTube Shorts', icon: '📺', enabled: false },
    { id: 'facebook', name: 'Facebook', icon: '👥', enabled: false },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', enabled: false },
    { id: 'twitter', name: 'Twitter/X', icon: '𝕏', enabled: false },
  ]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load from database/API on mount
  useEffect(() => {
    async function loadSettings() {
      // 1. Fetch from DB
      const dbPlatforms = await getUserPlatforms();
      
      // 2. Check for legacy localStorage data
      const savedLocal = localStorage.getItem('studio_platforms');
      
      if (dbPlatforms.length > 0) {
        // DB is the source of truth
        setPlatforms(prev => prev.map(p => ({
          ...p,
          enabled: dbPlatforms.includes(p.id)
        })));
        
        // Cleanup local storage if it was still there
        if (savedLocal) localStorage.removeItem('studio_platforms');
      } 
      else if (savedLocal) {
        // Migration logic: No DB data yet, but we have local data
        try {
          const parsed = JSON.parse(savedLocal);
          setPlatforms(prev => prev.map(p => ({
            ...p,
            enabled: parsed.includes(p.id)
          })));
          
          // Persist migration to DB immediately
          await updateUserPlatforms(parsed);
          localStorage.removeItem('studio_platforms');
          console.log('Successfully migrated settings from localStorage to Database.');
        } catch (e) {
          console.error('Failed to migrate local settings', e);
        }
      }
    }

    loadSettings();
  }, []);

  const handleToggle = (id: string) => {
    if (id === 'tiktok') {
      const platform = platforms.find(p => p.id === id);
      if (!platform?.enabled) {
        alert("TikTok distribution is functionally complete, but is temporarily disabled pending TikTok Developer App Audit. \n\nIn Sandbox mode, TikTok strictly requires test accounts to physically be set to 'Private Account' in the mobile app before allowing API uploads. \n\nPlease submit the app for audit to unlock public posting!");
        return; // Do not allow enabling
      }
    }

    setPlatforms(prev => prev.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const enabledIds = platforms.filter(p => p.enabled).map(p => p.id);
      await updateUserPlatforms(enabledIds);
      
      setHasUnsavedChanges(false);
      alert('Settings saved successfully to your cloud profile!');
    } catch (e) {
      console.error('Failed to save settings', e);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
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
        <div className={styles.grid}>
          {platforms.map((platform) => (
            <div key={platform.id} className={styles.platformCard}>
              <div className={styles.platformInfo}>
                <div className={styles.platformIcon}>{platform.icon}</div>
                <div>
                  <div className={styles.platformName}>{platform.name}</div>
                  <div className={styles.platformStatus}>
                    {platform.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
              <label className={styles.switch}>
                <input 
                  type="checkbox" 
                  checked={platform.enabled}
                  onChange={() => handleToggle(platform.id)}
                />
                <span className={styles.slider}></span>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span>🎬</span> YouTube Connection
        </h2>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
              YouTube Distribution
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
              Connect your Google account to start automating YouTube Shorts.
            </p>
          </div>
          <button 
            onClick={() => signIn('google')}
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px hsla(var(--primary) / 0.2)' }}
          >
            Connect Channel
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span>📸</span> Instagram Connection
        </h2>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span>👥</span> Facebook Connection
        </h2>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span>🎵</span> TikTok Connection
        </h2>
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              onClick={async () => {
                const res = await fetch('/api/settings/disconnect', { method: 'POST', body: JSON.stringify({ provider: 'tiktok' }) });
                if (res.ok) alert('TikTok Connection severed from the database! Please refresh, then sign in again.');
                else alert('Failed to disconnect. Please ensure you are logged in.');
              }}
              style={{ background: 'transparent', color: '#EF4444', border: '1px solid #EF4444', padding: '0.75rem 1.0rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
            >
              Disconnect
            </button>
            <button 
              onClick={() => alert("TikTok integration is functionally complete, but is temporarily disabled pending TikTok Developer App Audit. \n\nIn Sandbox mode, TikTok strictly requires test accounts to physically be set to 'Private Account' in the mobile app before allowing API uploads. \n\nPlease submit the app for audit to unlock public posting!")}
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'not-allowed', fontWeight: 600 }}
            >
              Connect TikTok (Requires Audit)
            </button>
          </div>
        </div>
      </section>


      <footer className={styles.footer}>
        <button 
          className={styles.saveBtn} 
          onClick={handleSave}
          disabled={!hasUnsavedChanges || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </footer>
    </div>
  );
};

export default SettingsPage;
