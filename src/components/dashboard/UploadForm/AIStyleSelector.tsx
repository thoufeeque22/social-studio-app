import React from 'react';
import { STYLE_MODES, StyleMode } from '@/lib/core/constants';

interface AIStyleSelectorProps {
  contentMode: StyleMode;
  onModeChange: (mode: StyleMode) => void;
}

const STYLE_DESCRIPTIONS: Record<StyleMode, string> = {
  Smart: "✨ Let AI decide the best strategy for each platform.",
  "Gen-Z": "🧢 High-energy, trendy, and scroll-stopping vibes.",
  SEO: "🔍 Search-optimized content for long-term discoverability.",
  Story: "📖 Narrative storytelling to build a human connection."
};

export const AIStyleSelector: React.FC<AIStyleSelectorProps> = ({ contentMode, onModeChange }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>AI Writing Strategy</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {STYLE_MODES.map(mode => {
          const isActive = contentMode === mode;
          const isSmart = mode === 'Smart';
          
          return (
            <button
              key={mode}
              type="button"
              title={STYLE_DESCRIPTIONS[mode]}
              onClick={() => onModeChange(mode)}
              style={{
                position: 'relative',
                padding: '0.55rem 1.15rem',
                borderRadius: '2rem',
                border: `1px solid ${isActive ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.4)'}`,
                background: isSmart && isActive 
                  ? 'linear-gradient(135deg, hsla(var(--primary) / 0.3), hsla(var(--primary) / 0.1))'
                  : isActive ? 'hsla(var(--primary) / 0.2)' : 'hsla(var(--muted) / 0.1)',
                color: isActive ? 'white' : 'hsl(var(--muted-foreground))',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 500,
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                whiteSpace: 'nowrap',
                boxShadow: isSmart && isActive ? '0 0 15px hsla(var(--primary) / 0.3)' : 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                if (contentMode !== mode) {
                  e.currentTarget.style.borderColor = 'hsla(var(--border) / 0.4)';
                  e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
                }
              }}
            >
              <div className="custom-tooltip" style={{ bottom: '135%' }}>
                {STYLE_DESCRIPTIONS[mode]}
              </div>
              {isSmart && <span style={{ marginRight: '4px' }}>✨</span>}
              {mode}
            </button>
          );
        })}
      </div>
    </div>
  );
};
