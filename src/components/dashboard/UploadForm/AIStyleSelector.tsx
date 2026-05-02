import React from 'react';
import { STYLE_MODES, StyleMode } from '@/lib/core/constants';

interface AIStyleSelectorProps {
  contentMode: StyleMode;
  onModeChange: (mode: StyleMode) => void;
}

const STYLE_DESCRIPTIONS: Record<StyleMode, string> = {
  Smart: "✨ Let AI decide the best strategy for each platform.",
  Hook: "🛑 Stop the scroll with pattern-interrupting openers.",
  SEO: "🔍 Search-optimized content for long-term discoverability.",
  "Gen-Z": "🧢 Authentic, low-caps, and trend-aware 'vibe-first' approach.",
  Story: "📖 Narrative storytelling using the Hero's Journey framework.",
  Value: "💡 Educational 'Quick Wins' that provide immediate utility.",
  Sales: "🚀 Direct conversion-focused copy with clear benefits and CTAs."
};

export const AIStyleSelector: React.FC<AIStyleSelectorProps> = ({ contentMode, onModeChange }) => {
  const coreModes: StyleMode[] = ['Smart', 'Hook', 'SEO'];
  const specializedModes: StyleMode[] = ['Gen-Z', 'Story', 'Value', 'Sales'];

  const renderButton = (mode: StyleMode, isSpecialized = false) => {
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
          padding: isSpecialized ? '0.45rem 0.9rem' : '0.55rem 1.15rem',
          borderRadius: '2rem',
          border: `1px solid ${isActive ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.4)'}`,
          background: isSmart && isActive 
            ? 'linear-gradient(135deg, hsla(var(--primary) / 0.3), hsla(var(--primary) / 0.1))'
            : isActive ? 'hsla(var(--primary) / 0.2)' : 'hsla(var(--muted) / 0.1)',
          color: isActive ? 'white' : 'hsl(var(--muted-foreground))',
          cursor: 'pointer',
          fontSize: isSpecialized ? '0.75rem' : '0.8rem',
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
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>AI Writing Strategy</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Core Group */}
        {coreModes.map(mode => renderButton(mode))}
        
        {/* Subtle Vertical Divider */}
        <div style={{ width: '1px', height: '1.2rem', background: 'hsla(var(--border) / 0.3)', margin: '0 0.25rem' }} />

        {/* Specialized Group */}
        {specializedModes.map(mode => renderButton(mode, true))}
      </div>
    </div>
  );
};
