import type { Metadata } from "next";
import Link from "next/link";
import { guideList } from "./guides";
import "./blog.css";

export const metadata:Metadata={
 title:"Buyer Guides | Jon Rover",
 description:"Straightforward Jaguar and Land Rover buyer guides from Jon McGeehan at Jaguar Land Rover Willow Grove.",
 alternates:{canonical:"https://jonrover.com/blog"}
};

const latestPosts=[
 {href:"/used-land-rover-section-179",eyebrow:"SECTION 179 · BUSINESS BUYERS",title:"Can a Used Land Rover Qualify for Section 179?",description:"How Section 179 can apply to qualifying used and Certified Pre-Owned Land Rovers, including business-use and vehicle-weight considerations."},
 {href:"/range-rover-sport-tax-write-off-calculator",eyebrow:"INTERACTIVE TOOL · 2026",title:"Range Rover Sport Tax Write-Off Calculator",description:"Estimate the business-use basis, potential Section 179 amount and approximate federal tax impact for a qualifying Range Rover Sport."},
 {href:"/range-rover-sport-section-179",eyebrow:"SECTION 179 · 2026",title:"Range Rover Sport Section 179: Weight Limit & Tax Write-Off Guide",description:"A practical explanation of the 6,000-lb GVWR rule, the 2026 heavy-SUV Section 179 limit and what business buyers should verify."},
 {href:"/are-land-rovers-reliable",eyebrow:"OWNERSHIP · RELIABILITY",title:"Are Land Rovers Reliable? An Honest Buyer’s Guide",description:"A straight answer on Land Rover reliability, what broad ratings do and do not tell you, and what to check before buying new or used."},
 {href:"/defender-110-vs-130",eyebrow:"DEFENDER · COMPARISON",title:"Defender 110 vs 130: Which One Should You Buy?",description:"Compare passenger space, third-row usefulness, cargo needs and everyday usability to decide which Defender fits your family."},
 {href:"/range-rover-swb-vs-lwb",eyebrow:"RANGE ROVER · COMPARISON",title:"Range Rover SWB vs LWB: Which One Should You Buy?",description:"A buyer-focused comparison of standard and long-wheelbase Range Rover configurations and who each version makes sense for."},
 {href:"/range-rover-autobiography-vs-se",eyebrow:"RANGE ROVER · TRIMS",title:"Range Rover Autobiography vs SE",description:"Understand the meaningful differences between Range Rover SE and Autobiography before deciding where the extra money matters."},
 {href:"/defender-110-for-sale-philadelphia",eyebrow:"SHOPPING · PHILADELPHIA",title:"Defender 110 for Sale near Philadelphia",description:"A direct route for Philadelphia-area shoppers looking for Defender 110 inventory and help narrowing down the right configuration."},
 {href:"/used-range-rover-sport-philadelphia",eyebrow:"SHOPPING · PHILADELPHIA",title:"Used Range Rover Sport for Sale near Philadelphia",description:"Shop pre-owned Range Rover Sport options near Philadelphia and compare equipment, history and available coverage."},
 {href:"/range-rover-for-sale-philadelphia",eyebrow:"SHOPPING · PHILADELPHIA",title:"Range Rover for Sale near Philadelphia",description:"A focused shopping page for Range Rover buyers in the Philadelphia area with direct access to Jon and current inventory."}
];

const posts=[
 ...latestPosts,
 {href:"/blog/doc-fees-and-non-tax-fees",eyebrow:"BUYING BASICS",title:"What Is the Doc Fee? Understanding Dealer Documentation and Non-Tax Fees",description:"A plain-English breakdown of documentary fees, title and registration charges, and other common non-tax line items on a vehicle buyer's order."},
 ...guideList.map(g=>({href:`/blog/${g.slug}`,eyebrow:g.eyebrow,title:g.title,description:g.description}))
];

export default function BlogPage(){return <main className="blogPage"><header className="blogNav shell"><Link href="/" className="brandLockup"><span className="brand">JON ROVER</span><span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span></Link><Link className="blogBack" href="/#inventory">LIVE INVENTORY →</Link></header><section className="blogHero shell"><p className="eyebrow">JON'S BUYER GUIDES</p><h1>Car buying, without the mystery.</h1><p>Practical answers to the questions people actually ask before buying or leasing a Jaguar or Land Rover. No generic dealership fluff.</p></section><section className="blogGrid shell">{posts.map(post=><Link className="blogCard" href={post.href} key={post.href}><div><span className="eyebrow">{post.eyebrow}</span><h2>{post.title}</h2><p>{post.description}</p></div><span>READ GUIDE →</span></Link>)}</section></main>}
