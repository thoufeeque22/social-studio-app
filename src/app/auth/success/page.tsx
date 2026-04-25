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
          const deepLink = `socialstudio://login-success?token=${token}`;
          const intentLink = `intent://login-success?token=${token}#Intent;scheme=socialstudio;package=com.thoufeeque.socialstudio;end`;

          // 1. Try the standard deep link first (most reliable for side-loaded apps)
          window.location.href = deepLink;

          // 2. Fallback to Intent after 1 second
          setTimeout(() => {
            window.location.href = intentLink;
          }, 1000);
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
        <a href={`socialstudio://login-success?token=${debugToken}`} style={{
          padding: '16px 32px',
          backgroundColor: '#6366F1',
          borderRadius: '12px',
          color: 'white',
          textDecoration: 'none',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
        }}>
          Open Social Studio
        </a>
      )}

      <div style={{ marginTop: '40px', fontSize: '12px', opacity: 0.4 }}>
        If you are stuck, make sure the Social Studio app is installed on this device.
      </div>
    </div>
  );
}
