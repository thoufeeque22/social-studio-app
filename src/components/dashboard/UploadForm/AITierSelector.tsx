import React from 'react';
import EditIcon from '@mui/icons-material/Edit';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { AITier, AI_TIERS } from '@/lib/core/constants';

interface AITierSelectorProps {
  selectedTier: AITier;
  onChange: (tier: AITier) => void;
}

export const AITierSelector: React.FC<AITierSelectorProps> = ({ selectedTier, onChange }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>AI Strategy</label>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {AI_TIERS.map(tier => (
          <button
            key={tier}
            type="button"
            onClick={() => onChange(tier)}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: `2px solid ${selectedTier === tier ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.5)'}`,
              background: selectedTier === tier ? 'hsla(var(--primary) / 0.2)' : 'hsla(var(--muted) / 0.3)',
              color: selectedTier === tier ? 'white' : 'hsl(var(--muted-foreground))',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: selectedTier === tier ? 700 : 500,
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              boxShadow: selectedTier === tier ? '0 0 15px hsla(var(--primary) / 0.3)' : 'none'
            }}
          >
            <span style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>
              {tier === 'Manual' ? <EditIcon fontSize="small" /> : tier === 'Enrich' ? <AutoFixHighIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
            </span>
            {tier}
          </button>
        ))}
      </div>
    </div>
  );
};
