import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
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
