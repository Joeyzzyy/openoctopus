import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "static.wavespeed.ai",
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/tools",
          destination: "https://openoctopus-tools.vercel.app/tools",
          basePath: false,
        },
        {
          source: "/tools/:path*",
          destination: "https://openoctopus-tools.vercel.app/tools/:path*",
          basePath: false,
        },
      ],
    };
  },
};

export default nextConfig;
