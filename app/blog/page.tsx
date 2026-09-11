import type { Metadata } from "next";
import Link from "next/link";
import { guideList } from "./guides";
import "./blog.css";

export const metadata:Metadata={
 title:"Buyer Guides | Jon Rover",
 description:"Straightforward Jaguar and Land Rover buyer guides from Jon McGeehan at Jaguar Land Rover Willow Grove.",
 alternates:{canonical:"https://jonrover.com/blog"}
};

const posts=[
 {href:"/blog/doc-fees-and-non-tax-fees",eyebrow:"BUYING BASICS",title:"What Is the Doc Fee? Understanding Dealer Documentation and Non-Tax Fees",description:"A plain-English breakdown of documentary fees, title and registration charges, and other common non-tax line items on a vehicle buyer's order."},
 ...guideList.map(g=>({href:`/blog/${g.slug}`,eyebrow:g.eyebrow,title:g.title,description:g.description}))
];

export default function BlogPage(){return <main className="blogPage"><header className="blogNav shell"><Link href="/" className="brandLockup"><span className="brand">JON ROVER</span><span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span></Link><Link className="blogBack" href="/#inventory">LIVE INVENTORY →</Link></header><section className="blogHero shell"><p className="eyebrow">JON'S BUYER GUIDES</p><h1>Car buying, without the mystery.</h1><p>Practical answers to the questions people actually ask before buying or leasing a Jaguar or Land Rover. No generic dealership fluff.</p></section><section className="blogGrid shell">{posts.map(post=><Link className="blogCard" href={post.href} key={post.href}><div><span className="eyebrow">{post.eyebrow}</span><h2>{post.title}</h2><p>{post.description}</p></div><span>READ GUIDE →</span></Link>)}</section></main>}
