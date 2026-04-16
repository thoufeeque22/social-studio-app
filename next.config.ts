import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Ngrok requests to hit the dev server without being blocked
  allowedDevOrigins: ["khalilah-spritelike-flossily.ngrok-free.dev"],
};

export default nextConfig;
