'use client';

import { useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Heading } from '@/components/ui/Heading';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Runtime Error:', error);
  }, [error]);

  return (
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <GlassCard style={{ 
        maxWidth: '500px', 
        width: '100%', 
        padding: '3rem', 
        textAlign: 'center',
        border: '1px solid hsla(var(--destructive) / 0.3)'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚠️</div>
        <Heading level={1} style={{ marginBottom: '1rem' }}>Something went wrong!</Heading>
        <p style={{ 
          color: 'hsl(var(--muted-foreground))', 
          marginBottom: '2rem',
          lineHeight: '1.6' 
        }}>
          Social Studio encountered an unexpected error. We&apos;ve logged the details and our team will look into it.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              background: 'hsl(var(--primary))',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: 'hsla(var(--muted) / 0.3)',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsla(var(--border) / 0.5)',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Go Home
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            background: 'black', 
            borderRadius: '0.5rem',
            textAlign: 'left',
            overflowX: 'auto'
          }}>
            <pre style={{ fontSize: '0.7rem', color: '#ff4444', margin: 0 }}>
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
