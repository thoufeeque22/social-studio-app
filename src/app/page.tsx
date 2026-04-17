"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type StyleMode = 'Hook' | 'SEO' | 'Gen-Z' | 'Manual';

export default function Home() {
  const { data: session } = useSession();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>([]);
  
  const [contentMode, setContentMode] = useState<StyleMode>('Manual');

  useEffect(() => {
    const saved = localStorage.getItem('studio_platforms');
    if (saved) {
      try {
        setEnabledPlatforms(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load platforms', e);
      }
    }
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
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    formData.append('contentMode', contentMode);

    if (!file || file.size === 0) {
      alert('Please select a video file.');
      return;
    }

    setIsUploading(true);
    const results: any = {};

    try {
      // 1. TikTok Upload (Conditional)
      if (enabledPlatforms.includes('tiktok')) {
        setUploadStatus('Uploading to TikTok...');
        const ttResponse = await fetch('/api/upload/tiktok', {
          method: 'POST',
          body: formData,
        });
        const ttResult = await ttResponse.json();
        if (!ttResult.success) throw new Error(`TikTok: ${ttResult.error}`);
        results.tiktok = ttResult.data;
        setUploadStatus('TikTok Success! ➡️ Next...');
      }

      // 2. YouTube Upload (Conditional)
      if (enabledPlatforms.includes('youtube')) {
        setUploadStatus('Uploading to YouTube...');
        const ytResponse = await fetch('/api/upload/youtube', {
          method: 'POST',
          body: formData,
        });
        const ytResult = await ytResponse.json();
        if (!ytResult.success) throw new Error(`YouTube: ${ytResult.error}`);
        results.youtube = ytResult.data;
        setUploadStatus('YouTube Success! ➡️ Next...');
      }

      // 3. Instagram Upload (Conditional)
      if (enabledPlatforms.includes('instagram')) {
        setUploadStatus('Uploading to Instagram Reels...');
        const igResponse = await fetch('/api/upload/instagram', {
          method: 'POST',
          body: formData,
        });
        const igResult = await igResponse.json();
        if (!igResult.success) throw new Error(`Instagram: ${igResult.error}`);
        results.instagram = igResult.data;
        setUploadStatus('Instagram Success! ➡️ Next...');
      }

      // 4. Facebook Native Upload (Conditional)
      if (enabledPlatforms.includes('facebook')) {
        setUploadStatus('Uploading to Facebook Page...');
        const fbResponse = await fetch('/api/upload/facebook', {
          method: 'POST',
          body: formData,
        });
        const fbResult = await fbResponse.json();
        if (!fbResult.success) throw new Error(`Facebook: ${fbResult.error}`);
        results.facebook = fbResult.data;
        setUploadStatus('Facebook Success! ➡️ Next...');
      }

      setUploadStatus('All uploads completed successfully!');
      form.reset();
      alert('Post completed across active platforms!');
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

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Video File</label>
                <input 
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
                <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Video Title</label>
                <input 
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
                <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Description</label>
                <textarea 
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



              <button 
                type="submit" 
                disabled={isUploading}
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
              {['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'Twitter'].map((p) => (
                <div key={p} style={{ 
                  textAlign: 'center', 
                  padding: '0.75rem', 
                  background: enabledPlatforms.includes(p.toLowerCase().replace(' shorts', '').replace(' reels', '')) ? 'hsla(var(--primary) / 0.1)' : 'hsla(var(--muted) / 0.2)',
                  borderRadius: '0.75rem',
                  fontSize: '0.8rem',
                  opacity: enabledPlatforms.includes(p.toLowerCase().replace(' shorts', '').replace(' reels', '')) ? 1 : 0.5
                }}>
                  {p}
                </div>
              ))}
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
