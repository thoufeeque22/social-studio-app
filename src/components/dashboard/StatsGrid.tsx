import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';

export const StatsGrid: React.FC = () => {
  const stats = [
    { label: 'Total Posts', value: '128', change: '+12%', icon: '📝' },
    { label: 'Avg. Reach', value: '45.2K', change: '+8.4%', icon: '🚀' },
    { label: 'Engagement', value: '5.2%', change: '+2.1%', icon: '❤️' },
    { label: 'Scheduled', value: '12', change: 'Next 7 days', icon: '📅' },
  ];

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
      gap: '1.5rem', 
      marginBottom: '3rem' 
    }}>
      {stats.map((stat) => (
        <GlassCard key={stat.label}>
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
        </GlassCard>
      ))}
    </div>
  );
};
