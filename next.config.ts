import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only used by `npm run dev`, which forces --webpack (see package.json)
  // to work around a Turbopack/network-drive path bug during local dev.
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
  // Production builds (e.g. on Vercel) use Turbopack, the Next.js 16
  // default. This empty config just silences the "webpack config with no
  // turbopack config" warning that otherwise fails the build.
  turbopack: {},
};

export default nextConfig;
