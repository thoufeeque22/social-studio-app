"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const setupDeepLinkListener = async () => {
      await App.addListener('appUrlOpen', async (event) => {
        console.log('[App] Deep link received:', event.url);

        try {
          const url = new URL(event.url);

          if (url.pathname.includes('login-success') || url.host === 'login-success') {
            const token = url.searchParams.get('token');

            if (token) {
              console.log('[App] Sync token found, injecting session...');

              // Set the session cookie manually in the WebView
              // We set multiple possible cookie names to ensure compatibility
              const cookieOptions = "; path=/; max-age=2592000; SameSite=Lax";

              document.cookie = `authjs.session-token=${token}${cookieOptions}`;
              document.cookie = `__Secure-authjs.session-token=${token}${cookieOptions}; Secure`;
              // Legacy names just in case
              document.cookie = `next-auth.session-token=${token}${cookieOptions}`;

              console.log('[App] Cookies set, closing browser and reloading...');

              await Browser.close();

              // Give the browser a moment to close before reloading
              setTimeout(() => {
                window.location.href = '/?logged_in=true';
              }, 500);
            } else {
              console.warn('[App] No token in deep link');
              await Browser.close();
            }
          }
        } catch (e) {
          console.error('[App] Error processing deep link:', e);
        }
      });
    };

    setupDeepLinkListener();

    return () => {
      App.removeAllListeners();
    };
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}
