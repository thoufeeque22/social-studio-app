import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Ngrok requests to hit the dev server without being blocked
  allowedDevOrigins: ["khalilah-spritelike-flossily.ngrok-free.dev"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50gb",
    },
    proxyClientMaxBodySize: "50gb",
  },
};

export default nextConfig;
