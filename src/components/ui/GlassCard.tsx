import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', style = {}, id }) => {
  return (
    <div 
      id={id}
      className={`glass-card ${className}`} 
      style={style}
    >
      {children}
    </div>
  );
};
