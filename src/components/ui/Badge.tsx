import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default',
  style 
}) => {
  const getStyles = () => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '6px',
      fontSize: '0.65rem',
      fontWeight: 700,
      letterSpacing: '0.025em',
      textTransform: 'uppercase',
      ...style
    };

    switch (variant) {
      case 'success':
        return { ...base, background: 'hsla(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)' };
      case 'error':
        return { ...base, background: 'hsla(0 84% 60% / 0.15)', color: 'hsl(0 84% 60%)' };
      case 'warning':
        return { ...base, background: 'hsla(38 92% 50% / 0.15)', color: 'hsl(38 92% 50%)' };
      case 'info':
        return { ...base, background: 'hsla(199 89% 48% / 0.15)', color: 'hsl(199 89% 48%)' };
      default:
        return { ...base, background: 'hsla(var(--primary) / 0.15)', color: 'hsl(var(--primary))' };
    }
  };

  return <span style={getStyles()}>{children}</span>;
};
