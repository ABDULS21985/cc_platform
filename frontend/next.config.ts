import type { NextConfig } from 'next';

const outputMode = process.env.NEXT_OUTPUT;
const output =
  outputMode === 'export' || outputMode === 'standalone' ? outputMode : undefined;

const nextConfig: NextConfig = {
  ...(output ? { output } : {}),
  images: {
    unoptimized: true,
  },
  // async rewrites() {
  //   return [
  //     {
  //       source: '/dashboard/community/:slug/:id',
  //       destination: '/dashboard/community/:id',
  //     },
  //   ];
  // },
};

export default nextConfig;
