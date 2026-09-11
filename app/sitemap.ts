import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const landingPages=["/range-rover","/range-rover-sport","/defender","/land-rover-certified-pre-owned","/jaguar"];
  return [
    {url:siteUrl,lastModified:now,changeFrequency:"daily",priority:1},
    ...landingPages.map(path=>({url:`${siteUrl}${path}`,lastModified:now,changeFrequency:"daily" as const,priority:.9})),
    {url:`${siteUrl}/privacy`,lastModified:now,changeFrequency:"yearly",priority:.2},
    {url:`${siteUrl}/terms`,lastModified:now,changeFrequency:"yearly",priority:.2},
  ];
}
