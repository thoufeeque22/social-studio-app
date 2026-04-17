"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { getUserAccounts } from './actions/user';
import { Account } from '@/lib/types';
import { formatHandle } from '@/lib/utils';

type StyleMode = 'Hook' | 'SEO' | 'Gen-Z' | 'Manual';

export default function Home() {
  const { data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  
  const [contentMode, setContentMode] = useState<StyleMode>('Manual');

  useEffect(() => {
    async function fetchAccounts() {
      const dbAccounts = await getUserAccounts();
      setAccounts(dbAccounts);
      // Select all accounts that are enabled for distribution by default
      setSelectedAccountIds(dbAccounts.filter(a => a.isDistributionEnabled).map(a => a.id));
    }
    
    fetchAccounts();
  }, []);

  const stats = [
    { label: 'Total Posts', value: '128', change: '+12%', icon: '📝' },
    { label: 'Avg. Reach', value: '45.2K', change: '+8.4%', icon: '🚀' },
    { label: 'Engagement', value: '5.2%', change: '+2.1%', icon: '❤️' },
    { label: 'Scheduled', value: '12', change: 'Next 7 days', icon: '📅' },
  ];

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('file') as File;
    
    if (!file || file.size === 0) {
      alert('Please select a video file.');
      return;
    }

    setIsUploading(true);
    const results: any = {};

    try {
      // Filter segments of accounts we need to upload to
      const selectedAccounts = accounts.filter(a => selectedAccountIds.includes(a.id));

      for (const account of selectedAccounts) {
        const platform = account.provider === 'google' ? 'youtube' : account.provider;
        const displayName = formatHandle(account.accountName, platform);
        
        setUploadStatus(`Uploading to ${platform} (${displayName})...`);
        
        // Prepare account-specific formData
        const accountFormData = new FormData();
        // Clone original form data
        for (const [key, value] of Array.from(formData.entries())) {
          accountFormData.append(key, value);
        }
        accountFormData.append('contentMode', contentMode);
        accountFormData.append('accountId', account.id);

        const response = await fetch(`/api/upload/${platform}`, {
          method: 'POST',
          body: accountFormData,
        });

        const result = await response.json();
        if (!result.success) throw new Error(`${platform} (${displayName}): ${result.error}`);
        
        results[account.id] = result.data;
        setUploadStatus(`${displayName} Success! ➡️ Next...`);
      }

      setUploadStatus('All uploads completed successfully!');
      form.reset();
      setSelectedAccountIds(accounts.filter(a => a.isDistributionEnabled).map(a => a.id));
      alert('Post completed across selected accounts!');
    } catch (error: any) {
      console.error('Process error:', error);
      setUploadStatus(`Error: ${error.message}`);
      alert(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dashboard Overview</h1>
          <p style={{ color: 'hsl(var(--muted-foreground))' }}>
            {session ? `Welcome back, ${session.user?.name}.` : "Welcome to Social Studio. Connect your account to get started."}
          </p>
        </div>
      </header>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '3rem' 
      }}>
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{stat.icon}</span>
              <span style={{ 
                fontSize: '0.8rem', 
                color: stat.change.startsWith('+') ? '#4ade80' : 'hsl(var(--muted-foreground))',
                background: stat.change.startsWith('+') ? 'rgba(74, 222, 128, 0.1)' : 'hsla(var(--muted) / 0.5)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.5rem'
              }}>
                {stat.change}
              </span>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{stat.value}</h3>
            <p style={{ fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="responsive-grid">
        {/* Upload Form */}
        <section id="create-post-section" className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Upload & Automate</h2>
          
          {uploadStatus && (
            <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem', borderColor: 'hsl(var(--primary))' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span className="animate-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(var(--primary))' }}></span>
                {uploadStatus}
              </p>
            </div>
          )}

            <form 
              aria-label="Upload Form"
              onSubmit={handleUpload} 
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="file-upload" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Video File</label>
                <input 
                  id="file-upload"
                  type="file" 
                  name="file" 
                  accept="video/*" 
                  required
                  style={{ 
                    background: 'hsla(var(--muted) / 0.3)', 
                    padding: '1rem', 
                    borderRadius: '0.75rem', 
                    border: '1px dashed hsla(var(--border) / 0.5)',
                    cursor: 'pointer'
                  }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="video-title" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Video Title</label>
                <input 
                  id="video-title"
                  type="text" 
                  name="title" 
                  placeholder="Enter a catchy title..."
                  required
                  style={{ 
                    background: 'hsla(var(--muted) / 0.3)', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '0.75rem', 
                    border: '1px solid hsla(var(--border) / 0.5)',
                    color: 'white',
                    outline: 'none'
                  }} 
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label htmlFor="video-description" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Description</label>
                <textarea 
                  id="video-description"
                  name="description" 
                  placeholder="Tell your viewers about the video..."
                  rows={3}
                  style={{ 
                    background: 'hsla(var(--muted) / 0.3)', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '0.75rem', 
                    border: '1px solid hsla(var(--border) / 0.5)',
                    color: 'white',
                    outline: 'none',
                    resize: 'none'
                  }} 
                />
              </div>

              {/* Intelligence Layer Additions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>AI Polish (Content Mode)</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(['Manual', 'Hook', 'SEO', 'Gen-Z'] as StyleMode[]).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setContentMode(mode)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '2rem',
                        border: `1px solid ${contentMode === mode ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.5)'}`,
                        background: contentMode === mode ? 'hsla(var(--primary) / 0.2)' : 'transparent',
                        color: contentMode === mode ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Distribution Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Distribution Channels</label>
                  {accounts.length === 0 && (
                    <Link href="/settings" style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', textDecoration: 'none' }}>
                      Connect an account →
                    </Link>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  {accounts.length > 0 ? (
                    accounts.map(account => {
                      const platform = account.provider === 'google' ? 'youtube' : account.provider;
                      const displayName = formatHandle(account.accountName, platform);
                      const isSelected = selectedAccountIds.includes(account.id);
                      
                      return (
                        <button
                          key={account.id}
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={`${platform}: ${displayName}`}
                          onClick={() => {
                            setSelectedAccountIds(prev => 
                              prev.includes(account.id) 
                                ? prev.filter(id => id !== account.id) 
                                : [...prev, account.id]
                            );
                          }}
                          style={{
                            padding: '0.6rem 1rem',
                            borderRadius: '0.75rem',
                            border: `1px solid ${isSelected ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.5)'}`,
                            background: isSelected ? 'hsla(var(--primary) / 0.15)' : 'hsla(var(--muted) / 0.2)',
                            color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: isSelected ? 'hsl(var(--primary))' : 'transparent',
                            border: isSelected ? 'none' : '1px solid hsla(var(--muted-foreground) / 0.5)'
                          }}></span>
                          <span style={{ opacity: 0.7, textTransform: 'capitalize' }}>{platform}:</span> {displayName}
                        </button>
                      );
                    })
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>
                      No active platforms found. Please enable them in Settings.
                    </p>
                  )}
                </div>
                {accounts.length > 0 && selectedAccountIds.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#EF4444' }}>Please select at least one account.</p>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isUploading || (accounts.length > 0 && selectedAccountIds.length === 0)}
                style={{ 
                  background: 'hsl(var(--primary))', 
                  color: 'white', 
                  border: 'none', 
                  padding: '1rem', 
                  borderRadius: '0.75rem', 
                  fontWeight: 700,
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px hsla(var(--primary) / 0.2)'
                }}
              >
                {isUploading ? '📤 Processing...' : '🚀 Post Video'}
              </button>
              
              {uploadStatus && (
                <p style={{ fontSize: '0.85rem', textAlign: 'center', color: 'hsl(var(--primary))', fontWeight: 500 }}>
                  {uploadStatus}
                </p>
              )}
            </form>
        </section>

        {/* Info Box */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Active Platforms</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'Twitter'].map((p) => {
                const providerMap: Record<string, string> = { 'instagram': 'facebook', 'tiktok': 'tiktok', 'youtube': 'google', 'facebook': 'facebook', 'linkedin': 'linkedin', 'twitter': 'twitter' };
                const provider = providerMap[p.toLowerCase()];
                const isEnabled = accounts.some(a => a.provider === provider && a.isDistributionEnabled);

                return (
                  <div key={p} style={{ 
                    textAlign: 'center', 
                    padding: '0.75rem', 
                    background: isEnabled ? 'hsla(var(--primary) / 0.1)' : 'hsla(var(--muted) / 0.2)',
                    borderRadius: '0.75rem',
                    fontSize: '0.8rem',
                    opacity: isEnabled ? 1 : 0.5
                  }}>
                    {p}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2rem', flex: 1 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Upcoming Posts</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[1, 2].map((i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', opacity: 0.5 }}>
                  <div style={{ 
                    width: '2px', 
                    background: 'hsl(var(--primary))', 
                    borderRadius: '2px',
                  }} />
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Post Scenario {i}</p>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Feature in dev...</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
