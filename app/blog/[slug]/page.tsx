import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { guides,guideList } from "../guides";
import "../blog.css";

const siteUrl="https://www.jonrover.com";
const jonId=`${siteUrl}/#jon-mcgeehan`;
export function generateStaticParams(){return guideList.map(g=>({slug:g.slug}));}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;const guide=guides[slug];if(!guide)return {};
 const url=`${siteUrl}/blog/${guide.slug}`;
 return {title:guide.title,description:guide.description,authors:[{name:"Jon McGeehan (Jon Rover)",url:siteUrl}],creator:"Jon McGeehan",publisher:"Jon Rover",alternates:{canonical:url},openGraph:{title:guide.title,description:guide.description,url,type:"article",siteName:"Jon Rover",authors:["Jon McGeehan"]},robots:{index:true,follow:true,googleBot:{index:true,follow:true,"max-snippet":-1,"max-image-preview":"large"}}};
}

export default async function GuidePage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const guide=guides[slug];if(!guide)notFound();
 const url=`${siteUrl}/blog/${guide.slug}`;
 const articleSchema={"@context":"https://schema.org","@type":"Article","@id":`${url}#article`,headline:guide.title,description:guide.description,url,mainEntityOfPage:{"@type":"WebPage","@id":url},author:{"@type":"Person","@id":jonId,name:"Jon McGeehan",alternateName:"Jon Rover",url:siteUrl,jobTitle:"Jaguar Land Rover Sales Consultant",worksFor:{"@type":"Organization",name:"Jaguar Land Rover Willow Grove"}},publisher:{"@type":"Person","@id":jonId},about:[{"@type":"Thing",name:"Land Rover"},{"@type":"Thing",name:"Range Rover"},{"@type":"Thing",name:"Jaguar Land Rover vehicle buying"}],datePublished:"2026-09-11",dateModified:"2026-09-14",inLanguage:"en-US"};
 const faqSchema={"@context":"https://schema.org","@type":"FAQPage","@id":`${url}#faq`,mainEntity:guide.faqs.map(x=>({"@type":"Question",name:x.q,acceptedAnswer:{"@type":"Answer",text:x.a}}))};
 const breadcrumb={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Jon Rover",item:siteUrl},{"@type":"ListItem",position:2,name:"Land Rover Buyer Guides",item:`${siteUrl}/blog`},{"@type":"ListItem",position:3,name:guide.title,item:url}]};
 return <main className="blogPage"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(articleSchema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb)}}/><header className="blogNav shell"><Link href="/" className="brandLockup"><span className="brand">JON ROVER</span><span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span></Link><Link className="blogBack" href="/blog">← ALL GUIDES</Link></header><article><section className="articleHero shell"><p className="eyebrow">{guide.eyebrow}</p><h1>{guide.title}</h1><p className="articleDek">{guide.dek}</p><p className="articleMeta">BY JON MCGEEHAN (JON ROVER) · JAGUAR LAND ROVER WILLOW GROVE · UPDATED SEPTEMBER 2026</p></section><div className="articleBody shell">{guide.sections.map(section=><section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((p,j)=><p key={j}>{p}</p>)}{section.bullets?.length?<ul>{section.bullets.map(x=><li key={x}>{x}</li>)}</ul>:null}</section>)}<section className="articleFaq"><p className="eyebrow">COMMON LAND ROVER BUYING QUESTIONS</p><h2>FAQ</h2>{guide.faqs.map((x,i)=><details key={x.q} open={i===0}><summary>{x.q}</summary><p>{x.a}</p></details>)}</section><div className="articleCta"><p className="eyebrow">WANT A REAL ANSWER ON A REAL VEHICLE?</p><h3>Ask Jon Rover.</h3><p>I'm Jon McGeehan, a sales consultant at Jaguar Land Rover Willow Grove. I can compare the actual vehicles in Willow Grove inventory, verify equipment and help you narrow the choices before you make the trip.</p><div className="articleActions"><a className="button dark" href="tel:+16092218478">CALL JON →</a>{guide.relatedHref?<Link className="button" href={guide.relatedHref}>{guide.relatedLabel||"VIEW INVENTORY"}</Link>:<Link className="button" href="/#inventory">VIEW LIVE INVENTORY</Link>}</div></div></div></article></main>;
}
