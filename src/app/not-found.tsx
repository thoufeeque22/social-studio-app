import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { Heading } from '@/components/ui/Heading';

export default function NotFound() {
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
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}></div>
        <Heading level={1} style={{ marginBottom: '1rem' }}>Page Not Found</Heading>
        <p style={{ 
          color: 'hsl(var(--muted-foreground))', 
          marginBottom: '2rem',
          lineHeight: '1.6' 
        }}>
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        
        <Link
          href="/"
          style={{
            display: 'inline-block',
            background: 'hsl(var(--primary))',
            color: 'white',
            padding: '0.75rem 2rem',
            borderRadius: '0.75rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
        >
          Return to Dashboard
        </Link>
      </GlassCard>
    </div>
  );
}
