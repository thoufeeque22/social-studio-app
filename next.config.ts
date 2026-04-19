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
    instrumentationHook: true,
  },
};

export default nextConfig;
