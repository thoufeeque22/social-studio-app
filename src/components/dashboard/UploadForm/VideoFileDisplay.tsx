import React from 'react';

interface VideoFileDisplayProps {
  fileName: string | null;
  format: 'short' | 'long';
  duration: number | null;
}

export const VideoFileDisplay: React.FC<VideoFileDisplayProps> = ({ fileName, format, duration }) => {
  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (!fileName) return null;

  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
      padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
      background: 'hsla(142, 71%, 45%, 0.1)', border: '1px solid hsla(142, 71%, 45%, 0.3)',
      marginBottom: '0.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem' }}>✅</span>
        <span style={{ fontSize: '0.8rem', color: 'hsl(142, 71%, 45%)' }}>
          <strong>{fileName}</strong> attached
        </span>
      </div>
      <div style={{ 
        background: format === 'short' ? 'hsla(var(--primary) / 0.2)' : 'hsla(var(--muted) / 0.4)',
        color: format === 'short' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        border: `1px solid ${format === 'short' ? 'hsla(var(--primary) / 0.3)' : 'hsla(var(--border) / 0.5)'}`
      }}>
        {format === 'short' ? '⚡ Short-Form' : '📺 Long-Form'}
        {duration !== null && (
          <span style={{ marginLeft: '4px', opacity: 0.8, fontWeight: 500 }}>
            • {formatDuration(duration)}
          </span>
        )}
      </div>
    </div>
  );
};
