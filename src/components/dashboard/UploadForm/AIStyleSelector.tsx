import React from 'react';
import { STYLE_MODES, StyleMode } from '@/lib/core/constants';

interface AIStyleSelectorProps {
  contentMode: StyleMode;
  onModeChange: (mode: StyleMode) => void;
}

export const AIStyleSelector: React.FC<AIStyleSelectorProps> = ({ contentMode, onModeChange }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Writing Style (Vibe)</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {STYLE_MODES.map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
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
  );
};
