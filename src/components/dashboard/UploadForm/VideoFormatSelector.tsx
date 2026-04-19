import React from 'react';
import { VideoFormat } from '@/lib/core/types';

interface VideoFormatSelectorProps {
  videoFormat: VideoFormat;
  onFormatChange: (format: VideoFormat) => void;
}

export const VideoFormatSelector: React.FC<VideoFormatSelectorProps> = ({ videoFormat, onFormatChange }) => {
  const formats: { id: VideoFormat; label: string; icon: string; description: string }[] = [
    { id: 'short', label: 'Short-form', icon: '📱', description: 'Vertical (9:16) • < 60s' },
    { id: 'long', label: 'Long-form', icon: '🖥️', description: 'Landscape (16:9) • Any length' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Target Video Format</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {formats.map(format => (
          <button
            key={format.id}
            type="button"
            aria-pressed={videoFormat === format.id}
            onClick={() => onFormatChange(format.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '1rem',
              borderRadius: '1rem',
              border: `1px solid ${videoFormat === format.id ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.5)'}`,
              background: videoFormat === format.id ? 'hsla(var(--primary) / 0.1)' : 'hsla(var(--muted) / 0.1)',
              color: videoFormat === format.id ? 'white' : 'hsl(var(--muted-foreground))',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{format.icon}</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{format.label}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{format.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
