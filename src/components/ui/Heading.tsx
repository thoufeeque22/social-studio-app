import React from 'react';

interface HeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
  style?: React.CSSProperties;
}

export const Heading: React.FC<HeadingProps> = ({ 
  children, 
  level = 1,
  className = '',
  style 
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  const getBaseStyles = (): React.CSSProperties => {
    switch (level) {
      case 1: return { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.5rem' };
      case 2: return { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: '1.5rem' };
      case 3: return { fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' };
      default: return { fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' };
    }
  };

  return (
    <Tag 
      className={className}
      style={{
        ...getBaseStyles(),
        color: 'hsl(var(--foreground))',
        ...style
      }}
    >
      {children}
    </Tag>
  );
};
