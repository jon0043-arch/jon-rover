import type {Metadata} from 'next';
import Link from 'next/link';
import '../seo-landing.css';
import './reviews-page.css';

export const metadata:Metadata={
 title:'Jon McGeehan Reviews | Jaguar Land Rover Willow Grove',
 description:'Read customer reviews about working with Jon McGeehan at Jaguar Land Rover Willow Grove and start shopping live Jaguar and Land Rover inventory.',
 alternates:{canonical:'/reviews'},
};

const reviews=[
 {quote:'Very knowledgeable and excellent communicator!',source:'Customer review · December 2025'},
 {quote:'He was attentive and patient.',source:'Customer review · April 2025'},
 {quote:"Definitely the best experience we've ever had at a dealership.",source:'Customer review · June 2025'},
 {quote:'Friendly, knowledgeable and efficient service from Jon.',source:'Customer review · September 2023'},
 {quote:'Sales person went above and beyond.',source:'Customer review · May 2024'},
 {quote:'Fast responses to all correspondences.',source:'Customer review · March 2026'},
 {quote:'He went above and beyond to make sure my buying experience was smooth and professional.',source:'Customer review'},
 {quote:'He made the process of car shopping much easier for me.',source:'Customer review'},
];
const JON_CALL_NUMBER='tel:+16092218478';

export default function ReviewsPage(){
 const schema={"@context":"https://schema.org","@type":"ProfilePage",name:'Jon McGeehan customer reviews',url:'https://jonrover.com/reviews',mainEntity:{"@type":"Person",name:'Jon McGeehan',alternateName:'Jon Rover',jobTitle:'Sales Guide',worksFor:{"@type":"Organization",name:'Jaguar Land Rover Willow Grove'}}};
 return <main className="seoPage reviewsPage">
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/>
  <header className="seoNav shell"><Link href="/" className="brandLockup"><span className="brand">JON ROVER</span><span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span></Link><Link className="seoBack" href="/#inventory">VIEW LIVE INVENTORY →</Link></header>
  <section className="reviewsHero shell"><p className="eyebrow">CUSTOMER REVIEWS</p><h1>A better experience, in their words.</h1><p>Buying a vehicle should feel straightforward. These are comments from customers who worked with Jon McGeehan at Jaguar Land Rover Willow Grove.</p><div className="seoActions"><Link className="button dark" href="/#inventory">SHOP LIVE INVENTORY →</Link><a className="button" href={JON_CALL_NUMBER}>CALL JON</a></div></section>
  <section className="reviewsPageGrid shell">{reviews.map((review,i)=><article className="reviewsPageCard" key={`${review.quote}-${i}`}><div className="reviewsPageStars">★★★★★</div><blockquote>“{review.quote}”</blockquote><p>{review.source}</p></article>)}</section>
  <section className="reviewsCta shell"><p className="eyebrow">WORK DIRECTLY WITH JON</p><h2>Start with the car. Stay for the straight answers.</h2><p>Browse the current Willow Grove inventory online, then call or text Jon when you want a real person to confirm availability, equipment and next steps.</p><div className="seoActions"><Link className="button dark" href="/#inventory">VIEW INVENTORY →</Link><Link className="button" href="/#about">ABOUT JON</Link></div></section>
  <section className="seoLinks shell"><p className="eyebrow">SHOP BY MODEL</p><div className="seoLinksGrid"><Link href="/range-rover">RANGE ROVER</Link><Link href="/range-rover-sport">RANGE ROVER SPORT</Link><Link href="/defender">DEFENDER</Link><Link href="/range-rover-velar">VELAR</Link><Link href="/range-rover-evoque">EVOQUE</Link><Link href="/discovery-sport">DISCOVERY SPORT</Link><Link href="/jaguar">JAGUAR</Link></div></section>
  <footer className="seoFooter shell">JON ROVER · JAGUAR LAND ROVER WILLOW GROVE · 609-221-8478</footer>
 </main>
}
