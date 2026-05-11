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
        {
          source: "/api/tools",
          destination: "https://openoctopus-tools.vercel.app/api/tools",
          basePath: false,
        },
        {
          source: "/api/tools/:path*",
          destination: "https://openoctopus-tools.vercel.app/api/tools/:path*",
          basePath: false,
        },
        {
          source: "/ai-api-platforms",
          destination: "https://openoctopus-seo.vercel.app/ai-api-platforms",
          basePath: false,
        },
        {
          source: "/ai-api-platforms/:path*",
          destination: "https://openoctopus-seo.vercel.app/ai-api-platforms/:path*",
          basePath: false,
        },
        {
          source: "/topics",
          destination: "https://openoctopus-seo.vercel.app/topics",
          basePath: false,
        },
        {
          source: "/topics/:path*",
          destination: "https://openoctopus-seo.vercel.app/topics/:path*",
          basePath: false,
        },
      ],
    };
  },
};

export default nextConfig;
