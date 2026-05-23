import type { MetadataRoute } from "next";

function getSiteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!value) {
    return "https://openoctopus.com";
  }

  return value.replace(/\/+$/, "");
}

function buildSiteUrl(pathname: string) {
  return new URL(pathname, `${getSiteOrigin()}/`).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: buildSiteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: buildSiteUrl("/pricing"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: buildSiteUrl("/docs"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: buildSiteUrl("/models"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: buildSiteUrl("/bestof"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: buildSiteUrl("/resource"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
