import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Tunnel requests to hit the dev server without being blocked
  allowedDevOrigins: [
    "khalilah-spritelike-flossily.ngrok-free.dev",
    "*.trycloudflare.com"
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "50gb",
    },
    proxyClientMaxBodySize: "50gb",
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

// Check if we should skip Sentry during build to save memory (useful for 1GB RAM VPS)
const shouldSkipSentry = process.env.SKIP_SENTRY_BUILD === "true";

export default shouldSkipSentry 
  ? nextConfig 
  : withSentryConfig(nextConfig, {
      org: "social-studio-pt",
      project: "social-studio",
      silent: !process.env.CI,
      widenClientFileUpload: false, // Disabled to save memory
      tunnelRoute: "/monitoring",
      // ... other options
    });
