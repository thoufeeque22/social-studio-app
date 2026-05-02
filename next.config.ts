import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Tunnel requests to hit the dev server without being blocked
  allowedDevOrigins: [
    "khalilah-spritelike-flossily.ngrok-free.dev",
    "*.trycloudflare.com",
    "social-studio.duckdns.org",
    "roohis-mac.tail8a2e7d.ts.net"
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "50gb",
    },
    proxyClientMaxBodySize: "50gb",
    instrumentationHook: true,
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

// Check if we should skip Sentry during build to save memory (useful for 1GB RAM VPS)
const shouldSkipSentry = process.env.SKIP_SENTRY_BUILD === "true";

export default shouldSkipSentry 
  ? nextConfig 
  : withSentryConfig(nextConfig, {
      // For all available options, see:
      // https://www.npmjs.com/package/@sentry/webpack-plugin#options

      org: "social-studio-pt",
      project: "social-studio",

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
    });
