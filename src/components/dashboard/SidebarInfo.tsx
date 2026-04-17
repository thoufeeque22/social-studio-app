import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Account } from '@/lib/types';
import { PLATFORMS } from '@/lib/constants';

interface SidebarInfoProps {
  accounts: Account[];
}

export const SidebarInfo: React.FC<SidebarInfoProps> = ({ accounts }) => {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <GlassCard style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Active Platforms</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {PLATFORMS.map((p) => {
            const isEnabled = accounts.some(a => a.provider === p.provider && a.isDistributionEnabled);

            return (
              <div key={p.id} style={{ 
                textAlign: 'center', 
                padding: '0.75rem', 
                background: isEnabled ? 'hsla(var(--primary) / 0.1)' : 'hsla(var(--muted) / 0.2)',
                borderRadius: '0.75rem',
                fontSize: '0.8rem',
                opacity: isEnabled ? 1 : 0.5
              }}>
                {p.name.split(' ')[0]}
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard style={{ padding: '2rem', flex: 1 }}>
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
      </GlassCard>
    </section>
  );
};
