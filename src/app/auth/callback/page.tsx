"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from '@/app/login/Login.module.css';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isNative = searchParams.get('native') === 'true';

  useEffect(() => {
    if (isNative) {
      console.log("[Auth] Native user detected, redirecting to app scheme...");
      // This triggers the deep link back to the Android/iOS app
      window.location.href = 'socialstudio://';
      
      // Fallback: If the user is still here after 3 seconds, they might have clicked 'Cancel' 
      // or the deep link failed. Show them a manual button.
    } else {
      // Regular web user, just go to dashboard
      router.push('/');
    }
  }, [isNative, router]);

  return (
    <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className={styles.loadingWrapper}>
        <div className={styles.logo}>🌌</div>
        <h2 className={styles.title}>Welcome Back!</h2>
        <p className={styles.subtitle}>
          {isNative 
            ? "Redirecting you back to the app..." 
            : "Taking you to your dashboard..."}
        </p>
        
        {isNative && (
          <button 
            className={styles.primaryAction} 
            style={{ marginTop: '20px' }}
            onClick={() => window.location.href = 'socialstudio://'}
          >
            Click here if not redirected
          </button>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
