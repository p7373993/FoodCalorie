import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 이미지 업로드를 위해 10MB로 증가
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*', // Django 백엔드로 프록시
      },
      {
        source: '/mlserver/:path*',
        destination: 'http://localhost:8000/mlserver/:path*', // MLServer로 프록시
      },
    ];
  },
};

export default nextConfig;
