import type { Metadata } from "next";
import Link from "next/link";
import { guideList } from "./guides";
import { competitorGuideList } from "./competitor-guides";
import "./blog.css";

export const metadata:Metadata={title:"Buyer Guides | Jon Rover",description:"Straightforward Jaguar and Land Rover buyer guides and competitor comparisons from Jon McGeehan at Jaguar Land Rover Willow Grove.",alternates:{canonical:"https://jonrover.com/blog"}};

const latestPosts=[
 {href:"/used-land-rover-section-179",eyebrow:"SECTION 179 · BUSINESS BUYERS",title:"Do Used Land Rovers Qualify for Section 179?",description:"See when a used or Certified Pre-Owned Land Rover may qualify for a Section 179 deduction."},
 {href:"/range-rover-sport-tax-write-off-calculator",eyebrow:"SECTION 179 · 2026",title:"Which Land Rovers Qualify for Section 179?",description:"See which Land Rover models may meet the Section 179 vehicle weight requirements and what business buyers need to know."},
 {href:"/range-rover-sport-section-179",eyebrow:"SECTION 179 · 2026",title:"Land Rover Section 179: Which Models Qualify?",description:"A simple guide to Land Rover models, the 6,000-lb GVWR rule and the Section 179 requirements business buyers should verify."},
 {href:"/are-land-rovers-reliable",eyebrow:"OWNERSHIP · RELIABILITY",title:"Are Land Rovers Reliable? An Honest Buyer’s Guide",description:"A straight answer on Land Rover reliability and what to check before buying new or used."}
];
const posts=[...latestPosts,...competitorGuideList.map(g=>({href:`/blog/${g.slug}`,eyebrow:g.eyebrow,title:g.title,description:g.description})),{href:"/blog/doc-fees-and-non-tax-fees",eyebrow:"BUYING BASICS",title:"What Is the Doc Fee? Understanding Dealer Documentation and Non-Tax Fees",description:"A plain-English breakdown of documentary fees, title and registration charges, and other common non-tax line items."},...guideList.map(g=>({href:`/blog/${g.slug}`,eyebrow:g.eyebrow,title:g.title,description:g.description}))];

export default function BlogPage(){return <main className="blogPage"><header className="blogNav shell"><Link href="/" className="brandLockup"><span className="brand">JON ROVER</span><span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span></Link><Link className="blogBack" href="/#inventory">LIVE INVENTORY →</Link></header><section className="blogHero shell"><p className="eyebrow">JON'S BUYER GUIDES</p><h1>Car buying, without the mystery.</h1><p>Practical answers and honest head-to-head comparisons for the questions people actually ask before buying or leasing a Jaguar or Land Rover. No generic dealership fluff.</p></section><section className="blogGrid shell">{posts.map(post=><Link className="blogCard" href={post.href} key={post.href}><div><span className="eyebrow">{post.eyebrow}</span><h2>{post.title}</h2><p>{post.description}</p></div><span>READ GUIDE →</span></Link>)}</section></main>}
