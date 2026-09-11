import Link from "next/link";
import "./seo-landing.css";

type Props={eyebrow:string;title:string;lead:string;heading:string;paragraphs:string[];current:string;heroImage?:string;heroAlt?:string};
type Faq={q:string;a:string};
const pages=[['/range-rover','RANGE ROVER'],['/range-rover-sport','RANGE ROVER SPORT'],['/range-rover-velar','RANGE ROVER VELAR'],['/range-rover-evoque','RANGE ROVER EVOQUE'],['/defender','DEFENDER'],['/discovery-sport','DISCOVERY SPORT'],['/land-rover-certified-pre-owned','CERTIFIED PRE-OWNED'],['/jaguar','JAGUAR']];
const JON_CALL_NUMBER="tel:+16092218478";
const JON_CALL_DISPLAY="609-221-8478";
const SITE_URL="https://jonrover.com";

function faqFor(current:string):Faq[]{
 const lower=current.toLowerCase();
 if(lower.includes('certified pre-owned'))return[
  {q:'Which Land Rover vehicles may qualify for certification?',a:'At Jaguar Land Rover Willow Grove, a Land Rover that is within four model years and under 60,000 miles may be eligible for the Certified Pre-Owned program, subject to the required inspection and program criteria.'},
  {q:'Can I lease a Certified Pre-Owned Land Rover?',a:'Leasing is generally for new vehicles. Pre-owned and Certified Pre-Owned vehicles are typically purchased or financed instead.'},
  {q:'Can Jon help me compare CPO and non-certified vehicles?',a:'Yes. Jon can help compare age, mileage, equipment, condition, price and certification eligibility so you can decide which vehicle makes the most sense.'},
  {q:'Do you work with buyers outside Willow Grove?',a:'Yes. Jon regularly helps buyers from the Philadelphia area, Montgomery County, Bucks County and South Jersey who are shopping Jaguar Land Rover Willow Grove inventory.'}
 ];
 const leaseAnswer=lower==='jaguar'?'New Jaguar vehicles can be lease candidates depending on the specific vehicle and current programs. Jon can confirm the exact options on a vehicle before you make a trip.':'New Land Rover vehicles can be lease candidates depending on the specific vehicle and current programs. Jon can confirm the exact options on a vehicle before you make a trip.';
 return[
  {q:`Can I lease a ${current}?`,a:leaseAnswer},
  {q:`Can a pre-owned ${current} be certified?`,a:`A pre-owned Land Rover within four model years and under 60,000 miles may be eligible for Land Rover certification, subject to inspection and program requirements. Jaguar certification rules may differ, so Jon can verify the specific vehicle.`},
  {q:`Can Jon help me find the right ${current} in stock?`,a:`Yes. The inventory on Jon Rover is connected to current Willow Grove inventory. You can shop ${current} vehicles directly or tell Jon what matters most and narrow the list from there.`},
  {q:'What areas does Jon serve?',a:'Jon works with customers from Willow Grove, Philadelphia, Montgomery County, Bucks County, South Jersey and beyond. You can start online and contact Jon before visiting the dealership.'},
  {q:'How do I check whether a specific vehicle is still available?',a:`Open the live inventory, choose the vehicle you are interested in and contact Jon directly. He can confirm availability, equipment and next steps.`}
 ];
}
function comparisonLinks(current:string){const x=current.toLowerCase();const links:{href:string;label:string}[]=[];if(x==='range rover'||x==='range rover sport')links.push({href:'/range-rover-vs-range-rover-sport',label:'RANGE ROVER VS RANGE ROVER SPORT'});if(x==='range rover velar'||x==='range rover evoque')links.push({href:'/range-rover-velar-vs-evoque',label:'VELAR VS EVOQUE'});if(x==='defender')links.push({href:'/defender-110-vs-130',label:'DEFENDER 110 VS 130'});return links;}

export default function ModelLanding({eyebrow,title,lead,heading,paragraphs,current,heroImage,heroAlt}:Props){
 const inventoryHref=`/?model=${encodeURIComponent(current)}#inventory`;
 const path=locationPath(current);
 const faqs=faqFor(current);
 const comparisons=comparisonLinks(current);
 const breadcrumb={"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"Jon Rover",item:SITE_URL},{"@type":"ListItem",position:2,name:current,item:`${SITE_URL}${path}`}]};
 const faqSchema={"@context":"https://schema.org","@type":"FAQPage",mainEntity:faqs.map(f=>({"@type":"Question",name:f.q,acceptedAnswer:{"@type":"Answer",text:f.a}}))};
 const webPage={"@context":"https://schema.org","@type":"WebPage",name:title,url:`${SITE_URL}${path}`,description:lead,about:{"@type":"Product",name:current,brand:{"@type":"Brand",name:current==='Jaguar'?'Jaguar':'Land Rover'}},author:{"@type":"Person",name:"Jon McGeehan",url:SITE_URL}};
 return <main className="seoPage">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb)}}/>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema)}}/>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(webPage)}}/>
  <header className="seoNav shell"><Link href="/" className="brandLockup"><span className="brand">JON ROVER</span><span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span></Link><div className="seoNavActions"><Link className="seoBack" href="/reviews">REVIEWS</Link><Link className="seoBack" href="/#inventory">LIVE INVENTORY →</Link></div></header>
  <nav className="seoBreadcrumb shell" aria-label="Breadcrumb"><Link href="/">JON ROVER</Link><span> / </span><span>{current.toUpperCase()}</span></nav>
  {heroImage?<section className="seoVisualHero"><img src={heroImage} alt={heroAlt||current}/><div className="seoVisualShade"/><div className="seoVisualContent shell"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="seoHeroLead">{lead}</p><div className="seoActions"><Link className="button dark" href={inventoryHref}>SHOP {current.toUpperCase()} →</Link><Link className="button seoLightButton" href="/#about">WORK WITH JON</Link><a className="button seoLightButton" href={JON_CALL_NUMBER}>CALL JON</a></div></div></section>:<section className="seoHero shell"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="seoHeroLead">{lead}</p><div className="seoActions"><Link className="button dark" href={inventoryHref}>SHOP {current.toUpperCase()} →</Link><Link className="button" href="/#about">WORK WITH JON</Link><a className="button" href={JON_CALL_NUMBER}>CALL JON</a></div></section>}
  <section className="seoBody shell"><h2>{heading}</h2><div className="seoBodyText">{paragraphs.map((p,i)=><p key={i}>{p}</p>)}<p>Jon Rover is built for buyers who want a direct line to a real salesperson at Jaguar Land Rover Willow Grove while still being able to research and browse online first.</p></div></section>
  {comparisons.length?<section className="seoLinks shell"><p className="eyebrow">COMPARE BEFORE YOU SHOP</p><div className="seoLinksGrid">{comparisons.map(link=><Link href={link.href} key={link.href}>{link.label}</Link>)}</div></section>:null}
  <section className="seoLocal shell"><p className="eyebrow">SHOP LOCAL · START ONLINE</p><div><h2>{current} help for the Philadelphia area.</h2><p>Shopping from Willow Grove, Philadelphia, Montgomery County, Bucks County or South Jersey? Start with the live inventory, then call or text Jon to confirm the vehicle, equipment and availability before you head to the store.</p><div className="seoActions"><Link className="button dark" href={inventoryHref}>VIEW {current.toUpperCase()} INVENTORY →</Link><a className="button" href={JON_CALL_NUMBER}>CALL {JON_CALL_DISPLAY}</a></div></div></section>
  <section className="seoFaq shell" aria-labelledby="faq-heading"><p className="eyebrow">COMMON QUESTIONS</p><h2 id="faq-heading">Questions about {current}.</h2><div className="seoFaqGrid">{faqs.map((faq,i)=><details key={faq.q} open={i===0}><summary>{faq.q}<span>+</span></summary><p>{faq.a}</p></details>)}</div></section>
  <section className="seoLinks shell"><p className="eyebrow">EXPLORE JON ROVER</p><div className="seoLinksGrid">{pages.filter(([href])=>href!==path).map(([href,label])=><Link href={href} key={href}>{label}</Link>)}<Link href="/reviews">CUSTOMER REVIEWS</Link><Link href="/#inventory">ALL INVENTORY</Link></div></section>
  <footer className="seoFooter shell">JON ROVER · JAGUAR LAND ROVER WILLOW GROVE · <a href={JON_CALL_NUMBER}>{JON_CALL_DISPLAY}</a></footer>
 </main>
}
function locationPath(current:string){const x=current.toLowerCase();if(x==='range rover')return '/range-rover';if(x==='range rover sport')return '/range-rover-sport';if(x==='range rover velar')return '/range-rover-velar';if(x==='range rover evoque')return '/range-rover-evoque';if(x==='defender')return '/defender';if(x==='discovery sport')return '/discovery-sport';if(x==='land rover certified pre owned')return '/land-rover-certified-pre-owned';if(x==='land rover certified pre-owned')return '/land-rover-certified-pre-owned';return '/jaguar'}