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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://jonrover.com");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {default:"Jon Rover | Jaguar Land Rover Willow Grove",template:"%s | Jon Rover"},
  description:"Shop Jaguar and Land Rover inventory with Jon McGeehan at Jaguar Land Rover Willow Grove. Get personal vehicle recommendations, live inventory matches, and direct help from Jon.",
  applicationName:"Jon Rover",authors:[{name:"Jon McGeehan"}],creator:"Jon McGeehan",publisher:"Jon Rover",
  openGraph:{type:"website",siteName:"Jon Rover",title:"Jon Rover | Jaguar Land Rover Willow Grove",description:"A more personal way to shop Jaguar and Land Rover. Browse live Willow Grove inventory and get Jon's top vehicle picks.",images:[{url:"/hero-defender.png",width:1600,height:900,alt:"Jon Rover - Jaguar Land Rover Willow Grove"}]},
  twitter:{card:"summary_large_image",title:"Jon Rover | Jaguar Land Rover Willow Grove",description:"Browse live Jaguar Land Rover Willow Grove inventory and get personal vehicle recommendations from Jon McGeehan.",images:["/hero-defender.png"]},
  robots:{index:true,follow:true,googleBot:{index:true,follow:true,"max-image-preview":"large","max-snippet":-1,"max-video-preview":-1}},
  verification:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?{google:process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION}:undefined,
};
const personSchema={"@context":"https://schema.org","@type":"Person",name:"Jon McGeehan",alternateName:"Jon Rover",url:siteUrl,jobTitle:"Sales Guide",worksFor:{"@type":"Organization",name:"Jaguar Land Rover Willow Grove"},knowsAbout:["Jaguar vehicles","Land Rover vehicles","Range Rover","Range Rover Sport","Defender","Jaguar Land Rover vehicle sales"]};
const websiteSchema={"@context":"https://schema.org","@type":"WebSite",name:"Jon Rover",url:siteUrl,description:"Personal Jaguar and Land Rover vehicle shopping assistance from Jon McGeehan at Jaguar Land Rover Willow Grove."};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(personSchema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(websiteSchema)}}/>{children}</body></html>}
