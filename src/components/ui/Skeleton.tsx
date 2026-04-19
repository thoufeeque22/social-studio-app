import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = '6px',
  className = '',
  style 
}) => {
  return (
    <div 
      className={`animate-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'hsla(var(--muted) / 0.15)',
        ...style
      }}
    />
  );
};
