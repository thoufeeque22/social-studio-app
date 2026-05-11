import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { getDashboardStats } from '@/app/actions/stats';
import DescriptionIcon from '@mui/icons-material/Description';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import FavoriteIcon from '@mui/icons-material/Favorite';

interface StatItem {
  label: string;
  value: string;
  change: string;
  icon: string;
}

const IconMap: Record<string, React.ReactNode> = {
  Description: <DescriptionIcon />,
  TrendingUp: <TrendingUpIcon />,
  Group: <GroupIcon />,
  Favorite: <FavoriteIcon />,
};

export const StatsGrid: React.FC = () => {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(data => {
        if (data) {
          setStats(data as StatItem[]);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load stats", err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '3rem' 
      }}>
        {[1, 2, 3, 4].map((i) => (
          <GlassCard key={i}>
            <div className="animate-pulse">
              <div style={{ height: '2rem', width: '2rem', background: 'hsla(var(--muted)/0.5)', borderRadius: '50%', marginBottom: '1rem' }} />
              <div style={{ height: '2rem', width: '60%', background: 'hsla(var(--muted)/0.5)', borderRadius: '0.5rem', marginBottom: '0.5rem' }} />
              <div style={{ height: '1rem', width: '40%', background: 'hsla(var(--muted)/0.2)', borderRadius: '0.5rem' }} />
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

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
            <span style={{ fontSize: '1.5rem', color: 'hsl(var(--primary))' }}>
              {IconMap[stat.icon] || <DescriptionIcon />}
            </span>
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
