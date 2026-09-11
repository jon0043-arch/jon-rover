import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { guides,guideList } from "../guides";
import "../blog.css";

export function generateStaticParams(){return guideList.map(g=>({slug:g.slug}));}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;const guide=guides[slug];if(!guide)return {};
 return {title:guide.title,description:guide.description,alternates:{canonical:`https://jonrover.com/blog/${guide.slug}`},openGraph:{title:guide.title,description:guide.description,url:`https://jonrover.com/blog/${guide.slug}`,type:"article"}};
}

export default async function GuidePage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const guide=guides[slug];if(!guide)notFound();
 const articleSchema={"@context":"https://schema.org","@type":"Article",headline:guide.title,description:guide.description,author:{"@type":"Person",name:"Jon McGeehan",url:"https://jonrover.com"},publisher:{"@type":"Organization",name:"Jon Rover",url:"https://jonrover.com"},mainEntityOfPage:`https://jonrover.com/blog/${guide.slug}`,datePublished:"2026-09-11",dateModified:"2026-09-11"};
 const faqSchema={"@context":"https://schema.org","@type":"FAQPage",mainEntity:guide.faqs.map(x=>({"@type":"Question",name:x.q,acceptedAnswer:{"@type":"Answer",text:x.a}}))};
 const breadcrumb={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Jon Rover",item:"https://jonrover.com"},{"@type":"ListItem",position:2,name:"Buyer Guides",item:"https://jonrover.com/blog"},{"@type":"ListItem",position:3,name:guide.title,item:`https://jonrover.com/blog/${guide.slug}`}]};
 return <main className="blogPage"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleSchema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb)}}/><header className="blogNav shell"><Link href="/" className="brandLockup"><span className="brand">JON ROVER</span><span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span></Link><Link className="blogBack" href="/blog">← ALL GUIDES</Link></header><article><section className="articleHero shell"><p className="eyebrow">{guide.eyebrow}</p><h1>{guide.title}</h1><p className="articleDek">{guide.dek}</p><p className="articleMeta">BY JON MCGEEHAN · JAGUAR LAND ROVER WILLOW GROVE · UPDATED SEPTEMBER 2026</p></section><div className="articleBody shell">{guide.sections.map((section,i)=><section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((p,j)=><p key={j}>{p}</p>)}{section.bullets?.length?<ul>{section.bullets.map(x=><li key={x}>{x}</li>)}</ul>:null}</section>)}<section className="articleFaq"><p className="eyebrow">COMMON QUESTIONS</p><h2>FAQ</h2>{guide.faqs.map((x,i)=><details key={x.q} open={i===0}><summary>{x.q}</summary><p>{x.a}</p></details>)}</section><div className="articleCta"><p className="eyebrow">WANT A REAL ANSWER ON A REAL VEHICLE?</p><h3>Ask Jon.</h3><p>I can compare the actual vehicles in Willow Grove inventory, verify the equipment and help you narrow the choices before you make the trip.</p><div className="articleActions"><a className="button dark" href="tel:+16092218478">CALL JON →</a>{guide.relatedHref?<Link className="button" href={guide.relatedHref}>{guide.relatedLabel||"VIEW INVENTORY"}</Link>:<Link className="button" href="/#inventory">VIEW LIVE INVENTORY</Link>}</div></div></div></article></main>;
}
