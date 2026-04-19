import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Account } from '@/lib/types';
import { PLATFORMS } from '@/lib/constants';
import { getUpcomingPosts } from '@/app/actions/history';

interface SidebarInfoProps {
  accounts: Account[];
}

export const SidebarInfo: React.FC<SidebarInfoProps> = ({ accounts }) => {
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = () => {
    getUpcomingPosts()
      .then(setUpcoming)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchQueue();
    window.addEventListener('refresh-upcoming', fetchQueue);
    return () => window.removeEventListener('refresh-upcoming', fetchQueue);
  }, []);

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
          {isLoading ? (
            [1, 2].map(i => (
              <div key={i} className="animate-pulse" style={{ display: 'flex', gap: '1rem' }}>
                 <div style={{ width: '2px', background: 'hsla(var(--muted)/0.2)', borderRadius: '2px' }} />
                 <div style={{ flex: 1 }}>
                   <div style={{ height: '0.85rem', width: '60%', background: 'hsla(var(--muted)/0.2)', marginBottom: '0.5rem', borderRadius: '4px' }} />
                   <div style={{ height: '0.75rem', width: '40%', background: 'hsla(var(--muted)/0.1)', borderRadius: '4px' }} />
                 </div>
              </div>
            ))
          ) : upcoming.length > 0 ? (
            upcoming.map((post) => (
              <div key={post.id} style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ 
                  width: '2px', 
                  background: 'hsl(var(--primary))', 
                  borderRadius: '2px',
                }} />
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{post.title}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                      {new Date(post.scheduledAt).toLocaleString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    {new Date(post.scheduledAt) < new Date() && (
                      <span style={{ fontSize: '0.65rem', background: 'hsla(var(--primary)/0.2)', color: 'hsl(var(--primary))', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        QUEUED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem' }}>
              No upcoming posts scheduled.
            </div>
          )}
        </div>
      </GlassCard>
    </section>
  );
};
