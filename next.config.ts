import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
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
          destination: "https://openoctopus-tools-theta.vercel.app/tools",
          basePath: false,
        },
        {
          source: "/tools/:path*",
          destination: "https://openoctopus-tools-theta.vercel.app/tools/:path*",
          basePath: false,
        },
        {
          source: "/api/tools",
          destination: "https://openoctopus-tools-theta.vercel.app/api/tools",
          basePath: false,
        },
        {
          source: "/api/tools/:path*",
          destination: "https://openoctopus-tools-theta.vercel.app/api/tools/:path*",
          basePath: false,
        },
        {
          source: "/resource",
          destination: "https://openoctopus-seo-nine.vercel.app/resource",
          basePath: false,
        },
        {
          source: "/resource/sitemap.xml",
          destination:
            "https://openoctopus-seo-nine.vercel.app/resource/sitemap.xml",
          basePath: false,
        },
        {
          source: "/resource/robots.txt",
          destination:
            "https://openoctopus-seo-nine.vercel.app/resource/robots.txt",
          basePath: false,
        },
        {
          source: "/resource/:path*",
          destination: "https://openoctopus-seo-nine.vercel.app/resource/:path*",
          basePath: false,
        }

      ],
    };
  },
};

export default nextConfig;
