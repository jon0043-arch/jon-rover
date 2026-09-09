"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const models = [
  { name: "Defender", kicker: "Purposeful. Iconic. Ready for anything." },
  { name: "Range Rover", kicker: "The flagship expression of modern luxury." },
  { name: "Range Rover Sport", kicker: "Performance with a sharper edge." },
  { name: "Jaguar", kicker: "Distinctive design with unmistakable character." },
];

const reviews = [
  {
    quote: "Very knowledgeable and excellent communicator!",
    source: "Customer review · December 2025",
  },
  {
    quote: "He was attentive and patient.",
    source: "Customer review · April 2025",
  },
  {
    quote: "Definitely the best experience we've ever had at a dealership.",
    source: "Customer review · June 2025",
  },
  {
    quote: "Friendly, knowledgeable and efficient service from Jon.",
    source: "Customer review · September 2023",
  },
  {
    quote: "Sales person went above and beyond.",
    source: "Customer review · May 2024",
  },
  {
    quote: "Fast responses to all correspondences.",
    source: "Customer review · March 2026",
  },
  {
    quote: "He went above and beyond to make sure my buying experience was smooth and professional.",
    source: "Customer review",
  },
  {
    quote: "He made the process of car shopping much easier for me.",
    source: "Customer review",
  },
];

export default function Home() {
  const heroRef = useRef<HTMLElement | null>(null);
  const heroImageRef = useRef<HTMLDivElement | null>(null);
  const heroCopyRef = useRef<HTMLDivElement | null>(null);
  const lineupRef = useRef<HTMLElement | null>(null);
  const approachRef = useRef<HTMLElement | null>(null);
  const finderRef = useRef<HTMLElement | null>(null);
  const [request, setRequest] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(heroImageRef.current, {
        yPercent: 12,
        scale: 1.06,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(heroCopyRef.current, {
        yPercent: -18,
        opacity: 0.22,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "18% top",
          end: "82% top",
          scrub: true,
        },
      });

      gsap.fromTo(
        lineupRef.current,
        { y: 90 },
        {
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: lineupRef.current,
            start: "top 92%",
            end: "top 55%",
            scrub: true,
          },
        }
      );

      gsap.from(".modelCard", {
        y: 40,
        opacity: 0,
        stagger: 0.08,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".modelGrid",
          start: "top 78%",
        },
      });

      gsap.from(".splitCopy > *", {
        y: 36,
        opacity: 0,
        stagger: 0.09,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: approachRef.current,
          start: "top 68%",
        },
      });

      gsap.fromTo(
        ".splitVisual img",
        { scale: 1.08 },
        {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: approachRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );

      gsap.from(".finderPanel", {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: finderRef.current,
          start: "top 72%",
        },
      });
    });

    return () => ctx.revert();
  }, []);

  function handleFinderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request.trim()) return;
    setSubmitted(true);
  }

  return (
    <main>
      <section ref={heroRef} className="hero" id="home">
        <div ref={heroImageRef} className="heroImage">
          <Image
            src="/hero-defender.png"
            alt="Land Rover Defender overlooking the mountains"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </div>

        <div className="heroShade" />

        <header className="nav shell">
          <a href="#home" className="brandLockup" aria-label="Jon Rover home">
            <span className="brand">JON ROVER</span>
            <span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span>
          </a>

          <nav aria-label="Primary navigation">
            <a href="#home">HOME</a>
            <a href="#models">VEHICLES</a>
            <a href="#finder">FIND MY VEHICLE</a>
            <a href="#about">ABOUT</a>
          </nav>

          <a className="pill dark" href="sms:">TEXT JON</a>
        </header>

        <div ref={heroCopyRef} className="heroCopy shell">
          <p className="eyebrow heroKicker">A MORE PERSONAL WAY TO BUY</p>
          <h1>DRIVEN<br />BY PEOPLE.</h1>
          <div className="line" />
          <p className="heroLead">
            Helping you find the right Jaguar or Land Rover — and enjoy the journey.
          </p>

          <div className="actions">
            <a className="button dark" href="#finder">FIND MY VEHICLE →</a>
            <a className="textLink" href="sms:">TEXT JON →</a>
          </div>
        </div>

        <div className="scrollCue" aria-hidden="true"><span>SCROLL</span><i /></div>
      </section>

      <section ref={lineupRef} id="models" className="modelsLayer">
        <div className="models shell">
          <div className="sectionTop">
            <div>
              <p className="eyebrow">EXPLORE THE LINEUP</p>
              <h2>Which model are you interested in?</h2>
            </div>
            <a className="textLink" href="#finder">VIEW ALL INVENTORY →</a>
          </div>

          <div className="modelGrid">
            {models.map((model, index) => (
              <a href="#finder" className="modelCard" key={model.name}>
                <div className="modelImage">
                  <Image
                    src="/hero-defender.png"
                    alt={model.name}
                    fill
                    sizes="(max-width: 900px) 50vw, 25vw"
                    style={{ objectFit: "cover", objectPosition: `${58 + index * 8}% center` }}
                  />
                  <span className="modelNumber">0{index + 1}</span>
                </div>
                <div className="modelMeta">
                  <div><strong>{model.name.toUpperCase()}</strong><p>{model.kicker}</p></div>
                  <span className="arrow">→</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section ref={approachRef} className="split">
        <div className="splitCopy">
          <p className="eyebrow">A MORE PERSONAL APPROACH</p>
          <h2>Straight answers.<br />No pressure.</h2>
          <p>
            I&apos;ve spent years helping people buy and enjoy Jaguars and Land Rovers. Whether you know exactly what you want or just have a few questions, I&apos;ll help you figure it out.
          </p>
          <div className="approachLinks">
            <a className="button dark" href="sms:">ASK JON A QUESTION →</a>
            <a className="textLink" href="#finder">FIND A VEHICLE →</a>
          </div>
        </div>

        <div className="splitVisual">
          <Image src="/hero-defender.png" alt="Luxury Land Rover detail" fill sizes="50vw" style={{ objectFit: "cover", objectPosition: "78% center" }} />
          <div className="visualWash" />
          <div className="quote">IT&apos;S MORE THAN A CAR.<br />IT&apos;S A DIFFERENT<br />PERSPECTIVE.</div>
        </div>
      </section>

      <section ref={finderRef} id="finder" className="finder">
        <div className="finderBg">
          <Image src="/hero-defender.png" alt="Land Rover mountain road" fill sizes="100vw" style={{ objectFit: "cover", objectPosition: "center 67%" }} />
        </div>
        <div className="finderShade" />

        <div className="finderContent shell">
          <div className="finderCopy">
            <p className="eyebrow">LET&apos;S FIND YOURS</p>
            <h2>LOOKING FOR<br />SOMETHING SPECIFIC?</h2>
            <p>Tell me what matters most. Size, budget, features, color, timing — whatever you know so far.</p>
          </div>

          <div className="finderPanel">
            <div className="finderPanelTop">
              <span className="eyebrow">AI VEHICLE FINDER</span>
              <span className="finderStatus">REAL INVENTORY SOON</span>
            </div>

            {!submitted ? (
              <form onSubmit={handleFinderSubmit}>
                <label htmlFor="vehicle-request">Tell me what you&apos;re looking for.</label>
                <textarea id="vehicle-request" value={request} onChange={(event) => setRequest(event.target.value)} placeholder="Example: Three kids, under $90k, sporty but not huge, preferably dark green." rows={5} />
                <div className="finderFormBottom">
                  <span>No pressure. Just a better starting point.</span>
                  <button type="submit">SHOW ME MY MATCHES →</button>
                </div>
              </form>
            ) : (
              <div className="finderConfirmation">
                <p className="eyebrow">NICE. THAT&apos;S EXACTLY HOW THIS WILL WORK.</p>
                <h3>Your request is ready for the inventory connection.</h3>
                <p>Next we&apos;ll connect live inventory so this can return your best three matches instead of sending you into a giant vehicle list.</p>
                <button type="button" onClick={() => setSubmitted(false)}>EDIT MY REQUEST</button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="reviewsSection" aria-labelledby="reviews-title">
        <div className="reviewsHeader shell">
          <div className="reviewsTop">
            <div>
              <p className="eyebrow">WHAT CUSTOMERS SAY</p>
              <h2 id="reviews-title">A better experience, in their words.</h2>
            </div>
            <div className="reviewStars" aria-label="Five star reviews">★★★★★</div>
          </div>
        </div>

        <div className="reviewsMarquee" aria-label="Customer reviews">
          <div className="reviewsTrack">
            {[...reviews, ...reviews].map((review, index) => (
              <article className="reviewCard" key={`${review.quote}-${index}`}>
                <div className="reviewCardStars">★★★★★</div>
                <blockquote>“{review.quote}”</blockquote>
                <p>{review.source}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="personalAbout">
        <div className="personalAboutInner shell">
          <div className="personalPortraitWrap">
            <img className="personalPortrait" src="https://di-uploads-pod1.dealerinspire.com/landroverwillowgrove/uploads/2018/04/IMG_0181-356x356.jpg" alt="Jon McGeehan at Land Rover Willow Grove" />
          </div>

          <div className="personalAboutCopy">
            <p className="eyebrow">ABOUT JON</p>
            <h2>Jon McGeehan</h2>
            <p className="personalRole">SALES GUIDE · JAGUAR LAND ROVER WILLOW GROVE</p>
            <p className="personalIntro">
              I&apos;ve spent years helping people find the right Jaguar or Land Rover without making the process feel like a typical car-buying experience. My approach is simple: listen, give you straight answers, and help you make the decision that actually fits.
            </p>
            <div className="personalAboutActions">
              <a className="button dark" href="sms:">TEXT JON →</a>
              <a className="textLink" href="#finder">FIND MY VEHICLE →</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer shell">
        <div>
          <div className="brand">JON ROVER</div>
          <div className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</div>
        </div>
        <p>A more personal way to buy.</p>
        <a className="pill dark" href="sms:">TEXT JON</a>
      </footer>
    </main>
  );
}
