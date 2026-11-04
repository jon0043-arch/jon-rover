import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://www.jonrover.com";
const description = "Meet Jon McGeehan, the person behind Jon Rover. Get straightforward luxury SUV advice and request to work directly with Jon.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Jon Rover | Work Directly With Jon McGeehan", template: "%s | Jon Rover" },
  description,
  alternates: { canonical: "/" },
  applicationName: "Jon Rover",
  authors: [{ name: "Jon McGeehan", url: siteUrl }],
  creator: "Jon McGeehan",
  publisher: "Jon Rover",
  category: "Automotive",
  keywords: ["Jon Rover", "Jon McGeehan", "luxury SUV specialist", "Range Rover buying advice", "Defender buying advice"],
  openGraph: { type: "website", url: siteUrl, siteName: "Jon Rover", title: "Jon Rover | Work Directly With Jon McGeehan", description, images: [{url: "/jon-bio.PNG", alt: "Jon McGeehan"}] },
  twitter: { card: "summary_large_image", title: "Jon Rover | Work With Jon", description, images: ["/jon-bio.PNG"] },
  robots: { index: true, follow: true },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : undefined,
};

const profileSchema = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": siteUrl + "/#profile",
  url: siteUrl,
  name: "Jon Rover — Jon McGeehan",
  mainEntity: {
    "@type": "Person",
    "@id": siteUrl + "/#jon-mcgeehan",
    name: "Jon McGeehan",
    alternateName: "Jon Rover",
    url: siteUrl,
    image: siteUrl + "/jon-bio.PNG",
    knowsAbout: ["Luxury SUVs", "Range Rover", "Defender", "Automotive sales"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profileSchema) }} />
        {children}
      </body>
    </html>
  );
}
