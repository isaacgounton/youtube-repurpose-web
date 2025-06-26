import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Configure static file serving
  async rewrites() {
    return [
      {
        source: '/clips/:path*',
        destination: '/api/serve-clip/:path*',
      },
    ];
  },

  // Environment variables
  env: {
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER || 'local',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  },
};

export default nextConfig;
