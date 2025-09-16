import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  distDir: isProd ? '.next' : '.next-dev',
  eslint: {
    // Skip lint during production builds in CI/App Hosting to save time
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Do not block production builds on type errors in CI/App Hosting
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  productionBrowserSourceMaps: false,
};

export default nextConfig;
