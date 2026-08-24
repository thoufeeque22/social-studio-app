import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';


import { BRAND } from "@/lib/core/brand";
import { ReticleDev } from './reticle-dev';

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} | Automated Poster`,
    template: `%s | ${BRAND.name}`,
  },
  description: "Next-gen social media distribution dashboard",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>
        {process.env.NODE_ENV === 'development' ? <ReticleDev /> : null}
        <AppRouterCacheProvider options={{ key: 'css' }}>
          <Providers>
            {children}
          </Providers>
        </AppRouterCacheProvider>
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src="https://cloud.umami.is/script.js"
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
