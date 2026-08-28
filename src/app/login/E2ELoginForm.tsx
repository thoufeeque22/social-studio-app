'use client';

import React, { useState, useRef, useTransition } from 'react';
import { signIn } from '@/lib/supabase/next-auth-react-shim';
import { E2E_TEST_IDS } from './e2eTestIds';
import { BRAND } from '@/lib/core/brand';

export function E2ELoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleClick = () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    setError(null);
    startTransition(async () => {
      try {
        document.cookie = `e2e-bypass=${encodeURIComponent(email)}; path=/`;
        window.location.href = '/';
      } catch (err: unknown) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  return (
    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid hsla(var(--border)/0.5)' }}>
      <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: '1rem', letterSpacing: '0.05em' }}>E2E Test Login</h3>
      <form ref={formRef} onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))' }}>
          Test Email
          <input name="email" type="email" id={E2E_TEST_IDS.email} placeholder={`tester@${BRAND.domain}`} defaultValue={`tester@${BRAND.domain}`} required data-testid={E2E_TEST_IDS.email} style={{ background: 'hsla(var(--muted)/0.3)', border: '1px solid hsla(var(--border)/0.5)', padding: '0.75rem', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem', color: 'hsl(var(--muted-foreground))' }}>
          Test Password
          <input name="password" type="password" id={E2E_TEST_IDS.password} placeholder="password" data-testid={E2E_TEST_IDS.password} style={{ background: 'hsla(var(--muted)/0.3)', border: '1px solid hsla(var(--border)/0.5)', padding: '0.75rem', borderRadius: '0.5rem', color: 'hsl(var(--foreground))' }} />
        </label>
        {error && ( <p role="alert" data-testid="e2e-login-error" style={{ color: 'hsl(var(--destructive))', fontSize: '0.85rem', margin: 0, padding: '0.5rem', background: 'hsla(var(--destructive)/0.1)', borderRadius: '0.375rem' }}> ⚠ {error} </p> )}
        <button type="button" id={E2E_TEST_IDS.submit} data-testid={E2E_TEST_IDS.submit} disabled={isPending} onClick={handleClick} style={{ background: isPending ? 'hsl(var(--muted))' : 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', border: 'none', padding: '0.75rem', borderRadius: '0.5rem', fontWeight: 600, cursor: isPending ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
          {isPending ? 'Signing in…' : 'Get Started'}
        </button>
      </form>
    </div>
  );
}
