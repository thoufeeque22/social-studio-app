"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const setupDeepLinkListener = async () => {
      // Clean up any existing listeners first
      await App.removeAllListeners();

      await App.addListener('appUrlOpen', async (event) => {
        console.log('[App] Deep link received:', event.url);

        try {
          // Handle both socialstudio://login-success and intent://...
          if (event.url.includes('login-success')) {
            const url = new URL(event.url);
            const token = url.searchParams.get('token');

            if (token) {
              console.log('[App] Sync token found, injecting session...');

              const cookieOptions = "; path=/; max-age=2592000; SameSite=Lax";
              document.cookie = `authjs.session-token=${token}${cookieOptions}`;
              document.cookie = `__Secure-authjs.session-token=${token}${cookieOptions}; Secure`;

              console.log('[App] Cookies set, closing browser and reloading...');

              try {
                await Browser.close();
              } catch (e) {
                console.log('Browser already closed or not available');
              }

              window.location.href = '/?logged_in=true';
            } else {
              console.warn('[App] No token in deep link');
              await Browser.close();
            }
          }
        } catch (e) {
          console.error('[App] Error processing deep link:', e);
          // Fallback if URL parsing fails but we know it's a success link
          if (event.url.includes('login-success')) {
             await Browser.close();
             window.location.href = '/';
          }
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
