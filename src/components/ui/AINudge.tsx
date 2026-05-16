import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';

interface AINudgeProps {
  featureKey: string;
  message?: string;
  tooltipText?: string;
  onClick?: () => void;
}

export const AINudge: React.FC<AINudgeProps> = ({ 
  featureKey, 
  message = "Try AI features", 
  tooltipText = "Enhance your content with AI",
  onClick 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const storageKey = `ai_nudge_dismissed_${featureKey}`;

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(storageKey);
      if (!isDismissed) {
        setIsVisible(true);
      }
    } catch (e) {
      // In case localStorage is blocked or not available
      console.warn('Failed to access localStorage for AINudge', e);
      setIsVisible(true); 
    }
  }, [storageKey]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.setItem(storageKey, 'true');
      setIsVisible(false);
      console.info(`[AINudge] Dismissed feature nudge: ${featureKey}`);
    } catch (e) {
      console.warn('Failed to set localStorage for AINudge', e);
      setIsVisible(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.info(`[AINudge] Clicked feature nudge: ${featureKey}`);
    if (onClick) {
      onClick();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Tooltip title={tooltipText} placement="top" arrow>
      <Box
        onClick={handleClick}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          padding: '2px 8px 2px 6px',
          borderRadius: '12px',
          background: 'hsla(var(--primary) / 0.1)',
          border: '1px solid hsla(var(--primary) / 0.2)',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: 'hsla(var(--primary) / 0.2)',
            transform: onClick ? 'translateY(-1px)' : 'none',
          },
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': { boxShadow: '0 0 0 0 hsla(var(--primary) / 0.4)' },
            '70%': { boxShadow: '0 0 0 4px hsla(var(--primary) / 0)' },
            '100%': { boxShadow: '0 0 0 0 hsla(var(--primary) / 0)' }
          }
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 14, color: 'hsl(var(--primary))' }} />
        <Typography variant="caption" sx={{ color: 'hsl(var(--primary))', fontWeight: 600, fontSize: '0.7rem' }}>
          {message}
        </Typography>
        <IconButton 
          size="small" 
          onClick={handleDismiss}
          sx={{ padding: 0, ml: 0.5, color: 'hsl(var(--primary) / 0.7)', '&:hover': { color: 'hsl(var(--primary))' } }}
          aria-label="Dismiss suggestion"
        >
          <CloseIcon sx={{ fontSize: 12 }} />
        </IconButton>
      </Box>
    </Tooltip>
  );
};
