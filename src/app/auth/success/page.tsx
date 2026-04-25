"use client";

import { useEffect, useState } from "react";
import { createSyncSession } from "@/lib/actions/auth";

export default function AuthSuccessPage() {
  const [status, setStatus] = useState("Securing session...");
  const [debugToken, setDebugToken] = useState<string | null>(null);

  useEffect(() => {
    async function sync() {
      try {
        const result = await createSyncSession();

        if (result.token) {
          setDebugToken(result.token);
          setStatus("Redirecting back to app...");

          const token = result.token;

          // Strategy 1: Custom Scheme (Simple)
          const deepLink = `socialstudio://login-success?token=${token}`;

          // Strategy 2: Package-specific Scheme (Capacitor default style)
          const packageLink = `com.thoufeeque.socialstudio://login-success?token=${token}`;

          // Try both
          window.location.href = deepLink;

          setTimeout(() => {
            window.location.href = packageLink;
          }, 500);

          // Strategy 3: Intent as absolute last resort
          setTimeout(() => {
            const intentLink = `intent://login-success?token=${token}#Intent;scheme=socialstudio;package=com.thoufeeque.socialstudio;S.browser_fallback_url=${encodeURIComponent(window.location.origin)};end`;
            window.location.href = intentLink;
          }, 1500);

        } else {
          setStatus("Authentication failed. Please try again.");
        }
      } catch (err) {
        console.error("Sync error:", err);
        setStatus("An error occurred during sync.");
      }
    }

    sync();
  }, []);

  const manualRedirect = () => {
    if (debugToken) {
       window.location.href = `socialstudio://login-success?token=${debugToken}`;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0F172A',
      color: 'white',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <div style={{ fontSize: '60px' }}>🌌</div>
      <h1 style={{ marginTop: '20px', fontSize: '24px' }}>Welcome Back!</h1>
      <p style={{ opacity: 0.8, marginBottom: '30px' }}>{status}</p>

      {debugToken && (
        <button
          onClick={manualRedirect}
          style={{
            padding: '16px 32px',
            backgroundColor: '#6366F1',
            borderRadius: '12px',
            color: 'white',
            border: 'none',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
          }}
        >
          Open Social Studio
        </button>
      )}

      <div style={{ marginTop: '40px', fontSize: '12px', opacity: 0.4 }}>
        If the button doesn't work, ensure you are opening this page <br/> in Chrome or the system browser.
      </div>
    </div>
  );
}
