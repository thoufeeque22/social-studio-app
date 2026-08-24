import { withSentryConfig } from "@sentry/nextjs";
import { withReticle } from '@reticlehq/next';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Allow Tunnel requests to hit the dev server without being blocked
  allowedDevOrigins: [
    "khalilah-spritelike-flossily.ngrok-free.dev",
    "*.trycloudflare.com",
    "directly-social.duckdns.org",
    "roohis-mac.tail8a2e7d.ts.net",
    "127.0.0.1",   // iOS Simulator Capacitor WebView
    "10.0.2.2",    // Android Emulator Capacitor WebView
  ],

  experimental: {
    serverActions: {
      bodySizeLimit: "50gb",
    },
    proxyClientMaxBodySize: "50gb",
    // Vercel only has a few GB of RAM. Limit workers to prevent OOM crashes (WorkerError)
    ...(process.env.VERCEL === "1" ? {
      cpus: 1,
      workerThreads: false,
      memoryBasedWorkersCount: true
    } : {}),
  },
  // Allow Capacitor WKWebView to receive HMR updates via polling
  // since WebSocket upgrades fail in the native WebView context.
  webpack(config, { dev, isServer }) {
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
      };
    }
    return config;
  },
  
  turbopack: {},

  serverExternalPackages: ["@prisma/client", "prisma"],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            // Baseline Next.js CSP. Allows inline scripts/styles for React/MUI to function correctly.
            // Tightened to remove https: wildcards and explicitly define form-action/base-uri.
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://eu-assets.i.posthog.com https://va.vercel-scripts.com https://cloud.umami.is https://gateway.umami.is; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: lh3.googleusercontent.com avatars.githubusercontent.com; font-src 'self' data:; connect-src 'self' https://eu-assets.i.posthog.com https://eu.i.posthog.com https://b57c147986d6e2daad87513d46e7ad85.r2.cloudflarestorage.com https://cloud.umami.is https://gateway.umami.is; form-action 'self'; base-uri 'self'; frame-ancestors 'none'; worker-src 'self' blob:; media-src 'self' blob:;",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/history",
        destination: "/activity",
        permanent: true,
      },
    ];
  },
};

// Check if we should skip Sentry during build to save memory (useful for 1GB RAM VPS)
const shouldSkipSentry = process.env.SKIP_SENTRY_BUILD === "true";

// Only wrap with Sentry if we have the necessary environment variables.
// This prevents noisy warnings during build when tokens are missing.
const useSentry = !shouldSkipSentry && !!process.env.SENTRY_AUTH_TOKEN;

const finalConfig = useSentry 
  ? withSentryConfig(nextConfig, {
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options

      org: "directly-social",
      project: "directly-social",

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: false, // Set to false to save memory on 1GB VPS, true on Mac

      // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
      // This can increase your server load as well as your hosting bill.
      tunnelRoute: "/monitoring",

      webpack: {
        // Enables automatic instrumentation of Vercel Cron Monitors.
        automaticVercelMonitors: true,

        // Tree-shaking options for reducing bundle size
        treeshake: {
          // Automatically tree-shake Sentry logger statements to reduce bundle size
          removeDebugLogging: true,
        },
      },
    })
  : nextConfig;

export default withReticle(finalConfig);

