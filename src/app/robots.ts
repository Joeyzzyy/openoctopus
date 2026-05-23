import type { MetadataRoute } from "next";

function getSiteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!value) {
    return "https://openoctopus.com";
  }

  return value.replace(/\/+$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/ops-hub", "/login", "/sign-in"],
    },
    sitemap: [`${origin}/sitemap.xml`, `${origin}/resource/sitemap.xml`],
    host: origin,
  };
}
