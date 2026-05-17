'use client';

import React from 'react';
import { Box, Typography, LinearProgress, Button } from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import { useUploadStatus } from '@/hooks/useUploadStatus';

interface UploadHUDProps {
  onStop?: () => void;
}

export const UploadHUD: React.FC<UploadHUDProps> = ({ onStop }) => {
  const { status, percent, active } = useUploadStatus();

  if (!active || !status) return null;

  const handleStop = () => {
    if (onStop) {
      onStop();
    } else {
      localStorage.removeItem('SS_STAGING_STATUS');
    }
  };

  return (
    <div style={{
      position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
      width: '95%', maxWidth: '500px', background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)', border: '1px solid hsla(var(--primary) / 0.5)', 
      borderRadius: '1.5rem', padding: '1.25rem 1.5rem',
      display: 'flex', flexDirection: 'column', gap: '1rem',
      boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 20px hsla(var(--primary) / 0.2)', 
      animation: 'slideUpHUD 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: 0 }}>
          <div className="animate-pulse" style={{ 
            width: '14px', height: '14px', borderRadius: '50%', 
            background: 'hsl(var(--primary))', boxShadow: '0 0 12px hsl(var(--primary))' 
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.05em' }}>Current Progress</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{status}</div>
          </div>
        </div>
        <button 
          type="button" 
          aria-label="Stop all active uploads"
          onClick={handleStop} 
          style={{ 
            background: '#EF4444', color: 'white', border: 'none', 
            padding: '0.75rem 1.5rem', borderRadius: '1rem', 
            fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <StopIcon sx={{ fontSize: 18 }} /> STOP ALL
        </button>
      </div>
      
      {percent !== null && (
        <Box sx={{ width: '100%', mt: -0.5 }}>
          <LinearProgress 
            variant="determinate" 
            value={percent} 
            sx={{ 
              height: 6, 
              borderRadius: 3,
              backgroundColor: 'hsla(var(--primary) / 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: 'linear-gradient(90deg, hsl(var(--primary)), #a855f7)',
              }
            }}
          />
          <Typography variant="caption" sx={{ color: 'hsla(var(--primary) / 0.8)', fontWeight: 700, mt: 0.5, display: 'block', textAlign: 'right' }}>
            {Math.round(percent)}%
          </Typography>
        </Box>
      )}

      <style jsx>{`
        @keyframes slideUpHUD {
          from { transform: translate(-50%, 150%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
