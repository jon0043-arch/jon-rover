import type { Metadata } from "next";
import Link from "next/link";
import { guideList } from "./guides";
import { competitorGuideList } from "./competitor-guides";
import "./blog.css";

export const metadata: Metadata = {
  title: "Range Rover & Land Rover Buyer Guides | Jon Rover",
  description: "Range Rover and Land Rover buying guides, reliability answers, model comparisons, ownership advice and shopping help from Jon McGeehan at Jaguar Land Rover Willow Grove.",
  alternates: { canonical: "https://www.jonrover.com/blog" },
  openGraph: {
    title: "Range Rover & Land Rover Buyer Guides | Jon Rover",
    description: "Practical Range Rover and Land Rover buying advice, comparisons and ownership guides from Jon McGeehan.",
    url: "https://www.jonrover.com/blog",
    type: "website",
    siteName: "Jon Rover",
  },
};

const latestPosts = [
  { href: "/used-land-rover-section-179", eyebrow: "SECTION 179 · BUSINESS BUYERS", title: "Do Used Land Rovers Qualify for Section 179?", description: "See when a used or Certified Pre-Owned Land Rover may qualify for a Section 179 deduction." },
  { href: "/range-rover-sport-tax-write-off-calculator", eyebrow: "SECTION 179 · 2026", title: "Which Land Rovers Qualify for Section 179?", description: "See which Land Rover models may meet the Section 179 vehicle weight requirements and what business buyers need to know." },
  { href: "/range-rover-sport-section-179", eyebrow: "SECTION 179 · RANGE ROVER SPORT", title: "Range Rover Sport Section 179 Guide", description: "A focused guide to Range Rover Sport weight, business-use requirements and Section 179 considerations." },
  { href: "/are-land-rovers-reliable", eyebrow: "OWNERSHIP · RELIABILITY", title: "Are Land Rovers Reliable? An Honest Buyer’s Guide", description: "A straight answer on Land Rover reliability and what to check before buying new or used." },
];

const posts = [
  ...latestPosts,
  ...competitorGuideList.map((g) => ({ href: `/blog/${g.slug}`, eyebrow: g.eyebrow, title: g.title, description: g.description })),
  { href: "/blog/doc-fees-and-non-tax-fees", eyebrow: "BUYING BASICS", title: "What Is the Doc Fee? Understanding Dealer Documentation and Non-Tax Fees", description: "A plain-English breakdown of documentary fees, title and registration charges, and other common non-tax line items." },
  ...guideList.map((g) => ({ href: `/blog/${g.slug}`, eyebrow: g.eyebrow, title: g.title, description: g.description })),
];

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Range Rover & Land Rover Buyer Guides",
  url: "https://www.jonrover.com/blog",
  description: "Range Rover and Land Rover buyer guides, comparisons and ownership advice from Jon McGeehan.",
  author: { "@type": "Person", "@id": "https://www.jonrover.com/#jon-mcgeehan", name: "Jon McGeehan", alternateName: "Jon Rover" },
  hasPart: posts.slice(0, 30).map((post) => ({ "@type": "WebPage", name: post.title, url: `https://www.jonrover.com${post.href}` })),
};

export default function BlogPage() {
  return <main className="blogPage">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
    <header className="blogNav shell"><Link href="/" className="brandLockup"><span className="brand">JON ROVER</span><span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span></Link><Link className="blogBack" href="/#inventory">LIVE INVENTORY →</Link></header>
    <section className="blogHero shell"><p className="eyebrow">RANGE ROVER & LAND ROVER BUYER GUIDES</p><h1>Car buying, without the mystery.</h1><p>Practical answers to the questions people ask before buying or leasing a Range Rover, Defender, Discovery or Jaguar — including model comparisons, reliability, ownership, fees, tax topics and Certified Pre-Owned shopping.</p></section>
    <section className="blogGrid shell">{posts.map((post) => <Link className="blogCard" href={post.href} key={post.href}><div><span className="eyebrow">{post.eyebrow}</span><h2>{post.title}</h2><p>{post.description}</p></div><span>READ GUIDE →</span></Link>)}</section>
  </main>;
}
