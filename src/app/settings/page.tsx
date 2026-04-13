"use client";

import React, { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
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
    const savedPlatforms = localStorage.getItem('studio_platforms');
    if (savedPlatforms) {
      try {
        const parsed = JSON.parse(savedPlatforms);
        setPlatforms(prev => prev.map(p => ({
          ...p,
          enabled: parsed.includes(p.id)
        })));
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }, []);

  const handleToggle = (id: string) => {
    setPlatforms(prev => prev.map(p => 
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Save platforms to localStorage
    const enabledIds = platforms.filter(p => p.enabled).map(p => p.id);
    localStorage.setItem('studio_platforms', JSON.stringify(enabledIds));
    
    setHasUnsavedChanges(false);
    setIsSaving(false);
    alert('Settings saved successfully!');
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
            style={{ background: '#1877F2', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px hsla(214, 89%, 52%, 0.2)' }}
          >
            Connect Instagram
          </button>
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
