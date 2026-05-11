import React from 'react';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

interface SchedulingSelectorProps {
  isScheduled: boolean;
  scheduledAt: string;
  onChange: (isScheduled: boolean, date: string) => void;
}

export const SchedulingSelector: React.FC<SchedulingSelectorProps> = ({ isScheduled, scheduledAt, onChange }) => {
  return (
    <div style={{ 
      padding: '1rem', 
      borderRadius: '0.75rem', 
      background: 'hsla(var(--muted)/0.3)', 
      border: '1px solid hsla(var(--border)/0.3)' 
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <input 
            type="checkbox" 
            checked={isScheduled}
            onChange={(e) => onChange(e.target.checked, scheduledAt)}
            style={{ marginRight: '0.5rem', width: '1.1rem', height: '1.1rem' }}
          />
          Schedule for later
        </label>
        {isScheduled && (
          <div 
            style={{ 
              position: 'relative', 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              width: '100%',
              maxWidth: '300px'
            }}
            onClick={(e) => {
              const input = e.currentTarget.querySelector('input');
              if (input && 'showPicker' in input) {
                (input as HTMLInputElement & { showPicker: () => void }).showPicker();
              }
            }}
          >
            <span style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none', fontSize: '1rem', display: 'flex', alignItems: 'center' }}>
            <CalendarMonthIcon sx={{ fontSize: 20 }} />
          </span>
            <input 
              type="datetime-local" 
              value={scheduledAt}
              onChange={(e) => onChange(true, e.target.value)}
              min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              required
              style={{ 
                background: 'hsla(var(--background)/0.5)', 
                border: '1px solid hsla(var(--border)/0.5)',
                borderRadius: '0.5rem',
                padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                color: 'white',
                fontSize: '0.85rem',
                outline: 'none',
                width: '100%',
                cursor: 'pointer'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
