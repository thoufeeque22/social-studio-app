import React from 'react';

export default function Home() {
  const stats = [
    { label: 'Total Posts', value: '128', change: '+12%', icon: '📝' },
    { label: 'Avg. Reach', value: '45.2K', change: '+8.4%', icon: '🚀' },
    { label: 'Engagement', value: '5.2%', change: '+2.1%', icon: '❤️' },
    { label: 'Scheduled', value: '12', change: 'Next 7 days', icon: '📅' },
  ];

  const recentMedia = [
    { id: 1, type: 'video', title: 'Product Launch Teaser', platform: 'Instagram', date: '2 hours ago' },
    { id: 2, type: 'image', title: 'Behind the Scenes', platform: 'TikTok', date: '5 hours ago' },
    { id: 3, type: 'video', title: 'Feature Walkthrough', platform: 'YouTube', date: 'Yesterday' },
  ];

  return (
    <div className="fade-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dashboard Overview</h1>
        <p style={{ color: 'hsl(var(--muted-foreground))' }}>Welcome back, Thoufeeque. Here's what's happening today.</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Recent Media */}
        <section className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recent Media</h2>
            <button style={{ 
              background: 'none', 
              border: 'none', 
              color: 'hsl(var(--primary))', 
              fontSize: '0.9rem', 
              fontWeight: 500,
              cursor: 'pointer' 
            }}>
              View All
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentMedia.map((media) => (
              <div key={media.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '1rem',
                background: 'hsla(var(--muted) / 0.3)',
                borderRadius: '0.75rem',
                border: '1px solid hsla(var(--border) / 0.5)'
              }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  background: 'hsla(var(--primary) / 0.2)', 
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem'
                }}>
                  {media.type === 'video' ? '📽️' : '🖼️'}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{media.title}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>{media.platform} • {media.date}</p>
                </div>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}>⋮</button>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions / Activity */}
        <section className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Upcoming Posts</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ 
                  width: '2px', 
                  background: 'hsl(var(--primary))', 
                  borderRadius: '2px',
                  opacity: 0.5 
                }} />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Instagram Reel Upload</p>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Today at 6:00 PM</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
