'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  className,
  style,
}) => {
  return (
    <div 
      className={className}
      style={{ 
        position: 'relative', 
        marginBottom: '1.5rem',
        ...style 
      }}
    >
      <Search 
        style={{ 
          position: 'absolute', 
          left: '1rem', 
          top: '50%', 
          transform: 'translateY(-50%)', 
          color: 'hsl(var(--muted-foreground))' 
        }} 
        size={20} 
      />
      <input 
        type="text" 
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ 
          width: '100%', 
          padding: '1rem 1rem 1rem 3rem', 
          borderRadius: '0.75rem', 
          border: '1px solid hsla(var(--border) / 0.5)',
          background: 'hsla(var(--muted) / 0.2)', 
          color: 'white',
          fontSize: '1rem',
          outline: 'none',
          transition: 'border-color 0.2s ease, background 0.2s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'hsla(var(--primary) / 0.5)';
          e.currentTarget.style.background = 'hsla(var(--muted) / 0.3)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'hsla(var(--border) / 0.5)';
          e.currentTarget.style.background = 'hsla(var(--muted) / 0.2)';
        }}
      />
    </div>
  );
};
