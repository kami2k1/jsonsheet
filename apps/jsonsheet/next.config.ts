import type { NextConfig } from 'next';

// Static export — served directly by nginx, no Node runtime needed on the VPS.
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
