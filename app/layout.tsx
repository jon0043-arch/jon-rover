import type { Metadata } from "next";
import "./globals.css";
import "./hero-position.css";
import "./about-section.css";
import "./reviews-section.css";
import "./inventory-section.css";
import "./hero-search-clean.css";
import "./concierge.css";
import "./crm.css";
import "./mobile-home-fix.css";
import "./hero-no-fade.css";
import "./seo-landing.css";
import "./model-nav.css";
import "./mobile-hero-polish.css";
import "./mobile-hero-height.css";

const siteUrl = "https://www.jonrover.com";
const identityDescription = "Jon McGeehan, known as Jon Rover, is a Jaguar Land Rover sales consultant at Jaguar Land Rover Willow Grove serving Range Rover, Defender, Discovery and Jaguar buyers in Willow Grove and the Philadelphia area.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Jon Rover | Jon McGeehan | Jaguar Land Rover Willow Grove", template: "%s | Jon Rover" },
  description: identityDescription,
  alternates: { canonical: "/" },
  applicationName: "Jon Rover",
  authors: [{ name: "Jon McGeehan (Jon Rover)", url: siteUrl }],
  creator: "Jon McGeehan",
  publisher: "Jon Rover",
  category: "Automotive",
  keywords: ["Jon Rover","Jon McGeehan","Jon McGeehan Land Rover","Jon McGeehan Willow Grove","Jaguar Land Rover Willow Grove","Land Rover Willow Grove","Range Rover Willow Grove","Range Rover Philadelphia","Land Rover salesperson Willow Grove","Range Rover salesperson Philadelphia","Jaguar salesperson Willow Grove","Defender Philadelphia","Jaguar Willow Grove","Land Rover Certified Pre-Owned Willow Grove"],
  openGraph: { type: "website", url: siteUrl, siteName: "Jon Rover", title: "Jon Rover | Jon McGeehan at Jaguar Land Rover Willow Grove", description: identityDescription, images: [{ url: "/hero-defender.png", width: 1600, height: 900, alt: "Jon Rover - Jon McGeehan at Jaguar Land Rover Willow Grove" }] },
  twitter: { card: "summary_large_image", title: "Jon Rover | Jon McGeehan at Jaguar Land Rover Willow Grove", description: identityDescription, images: ["/hero-defender.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
};

const personId = `${siteUrl}/#jon-mcgeehan`;
const organizationId = `${siteUrl}/#jlr-willow-grove`;
const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": personId,
  name: "Jon McGeehan",
  alternateName: ["Jon Rover", "JonRover"],
  url: siteUrl,
  image: `${siteUrl}/jon-bio.PNG`,
  telephone: "+1-609-221-8478",
  jobTitle: "Jaguar Land Rover Sales Consultant",
  description: identityDescription,
  worksFor: { "@id": organizationId },
  areaServed: ["Willow Grove, Pennsylvania", "Philadelphia, Pennsylvania", "Montgomery County, Pennsylvania", "Bucks County, Pennsylvania", "South Jersey"],
  knowsAbout: ["Jaguar","Land Rover","Range Rover","Range Rover Sport","Range Rover Velar","Range Rover Evoque","Defender","Discovery Sport","Jaguar Land Rover inventory","Land Rover Certified Pre-Owned","vehicle purchasing","vehicle trade-ins","automotive sales"],
};
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": organizationId,
  name: "Jaguar Land Rover Willow Grove",
  description: "Jaguar Land Rover dealership in Willow Grove, Pennsylvania where Jon McGeehan, known as Jon Rover, works as a sales consultant.",
  employee: { "@id": personId }
};
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  name: "Jon Rover",
  alternateName: ["JonRover.com", "Jon McGeehan - Jaguar Land Rover Willow Grove"],
  url: siteUrl,
  description: identityDescription,
  about: { "@id": personId },
  publisher: { "@id": personId },
  inLanguage: "en-US"
};
const profileSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${siteUrl}/#profile`,
  url: siteUrl,
  name: "Jon McGeehan (Jon Rover) - Jaguar Land Rover Willow Grove",
  mainEntity: { "@id": personId },
  isPartOf: { "@id": `${siteUrl}/#website` }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    {[personSchema, organizationSchema, websiteSchema, profileSchema].map((schema, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />)}
    {children}
  </body></html>;
}
