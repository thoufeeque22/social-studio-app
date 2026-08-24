"use client";

import React, { useState, useEffect } from 'react';
import styles from './Login.module.css';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { useSearchParams, useRouter } from 'next/navigation';
import { APP_CONFIG } from '@/lib/core/config';
import Alert from '@mui/material/Alert';
import { NativeBridgeOverlay } from './NativeBridgeOverlay';
import { E2ELoginForm } from './E2ELoginForm';
import { LoginButtons } from './LoginButtons';
import { LoginHeader } from './LoginHeader';
import { getErrorMessage } from './getErrorMessage';
import { createClient } from '@/lib/supabase/client';

export function LoginContent({ referrerName }: { referrerName?: string | null }) {
  const searchParams = useSearchParams();
  const errorMessage = getErrorMessage(searchParams.get('error'));
  const supabase = createClient();
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      document.cookie = `referralCode=${ref}; path=/; max-age=${30 * 24 * 60 * 60}`;
    }
  }, [searchParams]);



  const getRedirectUrl = () => {
    const cb = searchParams.get('callbackUrl') || '/';
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host.endsWith('.localhost');
    const appHostname = isLocal ? host : host.replace(/^staging\.directly\.social$/, 'app.staging.directly.social').replace(/^directly\.social$/, 'app.directly.social');
    const proto = isLocal ? 'http' : 'https';
    return `${proto}://${appHostname}${isLocal ? `:${window.location.port || 3000}` : ''}/auth/v1/callback?next=${cb}`;
  };

  const handleGoogleLogin = async () => {
    import('@/lib/analytics').then(({ trackEvent }) => trackEvent('signup'));
    const isNative = typeof window !== 'undefined' && Capacitor.getPlatform() !== 'web' && (Capacitor.isNativePlatform() || navigator.userAgent.includes(APP_CONFIG.userAgent));
    const redirectUrl = getRedirectUrl();
    if (isNative) {
      try { await Browser.open({ url: `${typeof window !== 'undefined' ? window.location.origin : APP_CONFIG.urls.production}/login?bridge=true&provider=google&native=true` }); } 
      catch { await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } }); }
      return;
    }
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } });
  };

  const handleEmailLogin = async (email: string) => {
    import('@/lib/analytics').then(({ trackEvent }) => trackEvent('signup'));
    setEmailMsg(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: getRedirectUrl() } });

    if (error) {
      setEmailMsg({ type: 'error', text: error.message });
    } else {
      setEmailMsg({ type: 'success', text: 'Check your email for the login link!' });
    }
  };

  if (searchParams.get('bridge') === 'true') return <NativeBridgeOverlay provider={searchParams.get('provider')} />;

  return (
    <div className={styles.container} style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className={styles.loginCard} style={{ margin: '0 auto' }}>
        <LoginHeader />
        {referrerName && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} data-testid="referral-banner">
            You&apos;ve been gifted 1 Free Month upon upgrading by {referrerName}!
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {errorMessage}
          </Alert>
        )}
        {emailMsg && (
          <Alert severity={emailMsg.type} sx={{ mb: 3, borderRadius: 2 }}>
            {emailMsg.text}
          </Alert>
        )}
        <LoginButtons 
          onGoogleClick={handleGoogleLogin} 
          onEmailSubmit={handleEmailLogin} 
        />
        {/* E2E Bypass Form */}
        <E2ELoginForm />
        <div className={styles.footer}>
          By continuing, you agree to our <br /> <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>
          <br /><br />
          <span style={{ opacity: 0.8 }}>🛡️ Privacy-First / Zero Tracking Cookies</span>
        </div>
      </div>
    </div>
  );
}
