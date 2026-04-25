"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // 1. Try to open the app via custom scheme
    // We pass a 'success' flag so the app knows to refresh
    const deepLink = "socialstudio://login-success";
    window.location.href = deepLink;

    // 2. Fallback: If they stay in the browser for 3 seconds,
    // show a manual button or redirect to home
    const timeout = setTimeout(() => {
      router.push("/");
    }, 3000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0F172A',
      color: 'white',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ fontSize: '40px' }}>🌌</div>
      <h2 style={{ marginTop: '20px' }}>Login Successful!</h2>
      <p style={{ opacity: 0.8 }}>Redirecting you back to the app...</p>

      <a href="socialstudio://login-success" style={{
        marginTop: '30px',
        padding: '12px 24px',
        backgroundColor: '#3B82F6',
        borderRadius: '8px',
        color: 'white',
        textDecoration: 'none',
        fontWeight: 'bold'
      }}>
        Open Social Studio
      </a>
    </div>
  );
}
