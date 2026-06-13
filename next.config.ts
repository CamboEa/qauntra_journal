import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"],
  experimental: {
    staleTimes: {
      dynamic: 60,   // prefetched dynamic-page shells stay fresh for 60s (up from 30s default)
      static: 300,
    },
  },
};

export default nextConfig;
