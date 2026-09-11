import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const landingPages=["/range-rover","/range-rover-sport","/range-rover-velar","/range-rover-evoque","/defender","/discovery-sport","/land-rover-certified-pre-owned","/jaguar","/reviews","/range-rover-vs-range-rover-sport","/range-rover-velar-vs-evoque","/defender-110-vs-130","/blog","/blog/doc-fees-and-non-tax-fees"];
  return [
    {url:siteUrl,lastModified:now,changeFrequency:"daily",priority:1},
    ...landingPages.map(path=>({url:`${siteUrl}${path}`,lastModified:now,changeFrequency:"weekly" as const,priority:path==="/reviews"?.8:path==="/blog"?.8:path.startsWith("/blog/")?.75:.9})),
    {url:`${siteUrl}/privacy`,lastModified:now,changeFrequency:"yearly",priority:.2},
    {url:`${siteUrl}/terms`,lastModified:now,changeFrequency:"yearly",priority:.2},
  ];
}
