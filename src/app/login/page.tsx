"use client";

import React, { useState } from 'react';
import { signIn } from "next-auth/react";
import styles from './Login.module.css';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export default function LoginPage() {
  const [showWarning, setShowWarning] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);

  const startGoogleLogin = async () => {
    const isNative = typeof window !== 'undefined' && 
                     (Capacitor.isNativePlatform() || navigator.userAgent.includes('SocialStudioApp'));
    
    console.log("Starting Google Login. Native detected:", isNative);
    
    try {
      if (isNative) {
        const baseUrl = 'https://social-studio-app.vercel.app';
        const authUrl = `${baseUrl}/api/auth/signin/google?callbackUrl=${encodeURIComponent('/')}`;
        console.log("Opening browser with URL:", authUrl);
        await Browser.open({ url: authUrl });
      } else {
        signIn('google', { callbackUrl: '/' });
      }
    } catch (error) {
      console.error("Login Error:", error);
      // Fallback for unexpected issues
      signIn('google', { callbackUrl: '/' });
    }
  };

  const handleLoginClick = async (provider: string) => {
    if (provider === 'google') {
      await startGoogleLogin();
      return;
    }

    setPendingProvider(provider);
    setShowWarning(true);
  };

  const confirmLogin = () => {
    if (pendingProvider) {
      signIn(pendingProvider, { callbackUrl: '/' });
    }
    setShowWarning(false);
  };

  return (
    <div className={styles.container}>
      {/* ⚠️ Intercepting Modal */}
      {showWarning && (
        <div className={styles.overlay} onClick={() => setShowWarning(false)}>
          <div className={styles.warningModal} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closeButton}
              onClick={() => setShowWarning(false)}
            >
              ✕
            </button>
            <div className={styles.modalIcon}>🔒</div>
            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle}>Unified Identity Check</h2>
              <p className={styles.modalText}>
                To keep all your social platforms in **one unified dashboard**, we recommend using your primary Google account. 
                <br /><br />
                Logging in with {pendingProvider} might create a separate, empty account if it uses a different email.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button 
                className={styles.primaryAction}
                onClick={async () => {
                  setShowWarning(false);
                  await startGoogleLogin();
                }}
              >
                Back to Google (Recommended)
              </button>
              <button 
                className={styles.secondaryAction}
                onClick={confirmLogin}
              >
                Continue with {pendingProvider} anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.contentWrapper}>
        
        {/* Features / Details Section */}
        <section className={styles.featuresSection}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Automate your <br />
              Social presence.
            </h1>
            <p className={styles.heroSubtitle}>
              One-click distribution to TikTok, Instagram, and YouTube Shorts without the automation fees.
            </p>
          </div>

          <div className={styles.featureList}>
            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>🚀</div>
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>Native Publishing</span>
                <span className={styles.featureDesc}>Direct API hooks for maximum reliability and speed.</span>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>💎</div>
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>Zero Maintenance</span>
                <span className={styles.featureDesc}>No need for complex n8n or Zapier workflows.</span>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureIcon}>📊</div>
              <div className={styles.featureText}>
                <span className={styles.featureTitle}>Unified Analytics</span>
                <span className={styles.featureDesc}>Track performance across all platforms in one view.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Login Card */}
        <div className={styles.loginCard}>
          <div className={styles.header}>
            <div className={styles.logo}>🌌</div>
            <h1 className={styles.title}>Social Studio</h1>
            <p className={styles.subtitle}>Sign in to manage your automated distribution.</p>
          </div>

          <div className={styles.buttonGroup}>
            <button 
              onClick={() => handleLoginClick("google")}
              className={`${styles.loginBtn} ${styles.googleBtn}`}
            >
              <span className={styles.btnIcon}>G</span>
              Continue with Google
            </button>

            <button 
              onClick={() => handleLoginClick("facebook")}
              className={`${styles.loginBtn} ${styles.facebookBtn}`}
            >
              <span className={styles.btnIcon}>f</span>
              Continue with Facebook
            </button>

            <button 
              onClick={() => handleLoginClick("tiktok")}
              className={`${styles.loginBtn} ${styles.tiktokBtn}`}
            >
              <span className={styles.btnIcon}>d</span>
              Continue with TikTok
            </button>
          </div>

          <div className={styles.footer}>
            By continuing, you agree to our 
            <br />
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
          </div>

          <div className={styles.linkingTip}>
            <span className={styles.tipIcon}>💡</span>
            <div className={styles.tipContent}>
              <strong>One Dashboard for All Platforms</strong>
              To manage all your platforms in one place, log in with a primary method first, then connect others in <strong>Settings</strong>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
