"use client";

import { useEffect, useState } from "react";
import { createSyncSession } from "@/lib/actions/auth";

export default function AuthSuccessPage() {
  const [status, setStatus] = useState("Securing session...");

  useEffect(() => {
    async function sync() {
      try {
        const result = await createSyncSession();

        if (result.token) {
          setStatus("Redirecting back to app...");

          // Pass the token back to the app via deep link
          const intentLink = `intent://login-success?token=${result.token}#Intent;scheme=socialstudio;package=com.thoufeeque.socialstudio;end`;
          const schemeLink = `socialstudio://login-success?token=${result.token}`;

          // Try to redirect
          window.location.href = intentLink;

          // Fallback
          setTimeout(() => {
            window.location.href = schemeLink;
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

      <div style={{ fontSize: '14px', opacity: 0.5 }}>
        Checking your identity and syncing with the app...
      </div>
    </div>
  );
}
