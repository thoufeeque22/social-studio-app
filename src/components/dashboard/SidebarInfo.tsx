import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Heading } from '@/components/ui/Heading';
import { getUpcomingPosts } from '@/app/actions/history';
import { usePolling } from '@/hooks/usePolling';
import type { PostHistory } from '@prisma/client';

export const SidebarInfo: React.FC = () => {
  const [upcoming, setUpcoming] = useState<PostHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = () => {
    getUpcomingPosts()
      .then(setUpcoming)
      .finally(() => setIsLoading(false));
  };

  const [now, setNow] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const initialTimer = setTimeout(() => {
      setNow(Date.now());
      interval = setInterval(() => setNow(Date.now()), 10000);
    }, 0);
    return () => {
      clearTimeout(initialTimer);
      if (interval) clearInterval(interval);
    };
  }, []);

  const hasActivePosts = upcoming.some(post => {
    const scheduledTime = new Date(post.scheduledAt).getTime();
    return now > 0 && scheduledTime <= now + 30000;
  });

  usePolling({
    callback: fetchQueue,
    interval: hasActivePosts ? 5000 : 30000,
    isActive: upcoming.length > 0
  });

  useEffect(() => {
    fetchQueue();
    window.addEventListener('refresh-upcoming', fetchQueue);
    return () => window.removeEventListener('refresh-upcoming', fetchQueue);
  }, []);

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <GlassCard style={{ padding: '2rem', flex: 1 }}>
        <Heading level={2}>Upcoming Posts</Heading>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isLoading ? (
            [1, 2].map(i => (
              <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                 <Skeleton width="2px" height="2.5rem" borderRadius="2px" />
                 <div style={{ flex: 1 }}>
                   <Skeleton width="60%" height="0.85rem" style={{ marginBottom: '0.5rem' }} />
                   <Skeleton width="40%" height="0.75rem" />
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
                      <Badge variant="success">QUEUED</Badge>
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
