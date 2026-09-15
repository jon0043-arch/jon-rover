import type { MetadataRoute } from "next";

const siteUrl = "https://www.jonrover.com";
const privateRoutes = ["/api/", "/crm/", "/inventory-load/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privateRoutes },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: privateRoutes },
      { userAgent: "ChatGPT-User", allow: "/", disallow: privateRoutes },
      { userAgent: "Googlebot", allow: "/", disallow: privateRoutes },
      { userAgent: "Bingbot", allow: "/", disallow: privateRoutes },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
