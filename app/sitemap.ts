import type { MetadataRoute } from "next";
import { guideList } from "./blog/guides";
import { competitorGuideList } from "./blog/competitor-guides";

const siteUrl = "https://www.jonrover.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const landingPages = [
    "/range-rover",
    "/range-rover-sport",
    "/range-rover-velar",
    "/range-rover-evoque",
    "/defender",
    "/discovery-sport",
    "/land-rover-certified-pre-owned",
    "/jaguar",
    "/reviews",
    "/are-land-rovers-reliable",
    "/section-179-vehicle-calculator",
    "/range-rover-sport-section-179",
    "/range-rover-sport-tax-write-off-calculator",
    "/used-land-rover-section-179",
    "/where-to-buy-range-rover-philadelphia",
    "/range-rover-for-sale-philadelphia",
    "/defender-110-for-sale-philadelphia",
    "/used-range-rover-sport-philadelphia",
    "/range-rover-vs-range-rover-sport",
    "/range-rover-velar-vs-evoque",
    "/defender-110-vs-130",
    "/range-rover-swb-vs-lwb",
    "/range-rover-autobiography-vs-se",
    "/blog",
    "/blog/doc-fees-and-non-tax-fees",
  ];

  const guidePages = [...guideList, ...competitorGuideList].map((guide) => `/blog/${guide.slug}`);
  const uniquePages = [...new Set([...landingPages, ...guidePages])];

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...uniquePages.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "/reviews" || path === "/blog" ? 0.8 : path.startsWith("/blog/") ? 0.75 : 0.9,
    })),
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly" as const, priority: 0.2 },
  ];
}
