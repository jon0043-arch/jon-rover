"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const models = ["Defender", "Range Rover", "Range Rover Sport", "Jaguar"];

export default function Home() {
  const heroRef = useRef<HTMLElement | null>(null);
  const heroImageRef = useRef<HTMLDivElement | null>(null);
  const heroCopyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(heroImageRef.current, {
        yPercent: 10,
        scale: 1.04,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(heroCopyRef.current, {
        yPercent: -16,
        opacity: 0.35,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    return () => ctx.revert();
  }, []);

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
          <div>
            <div className="brand">JON McGEEHAN</div>
            <div className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</div>
          </div>

          <nav>
            <a href="#home">HOME</a>
            <a href="#models">VEHICLES</a>
            <a href="#guides">GUIDES</a>
            <a href="#about">ABOUT</a>
          </nav>

          <a className="pill dark" href="sms:">
            TEXT JON
          </a>
        </header>

        <div ref={heroCopyRef} className="heroCopy shell">
          <p className="eyebrow">A MORE PERSONAL WAY TO BUY</p>
          <h1>
            DRIVEN
            <br />
            BY PEOPLE.
          </h1>
          <div className="line" />
          <p className="heroLead">
            Helping you find the right Jaguar or Land Rover — and enjoy the journey.
          </p>

          <div className="actions">
            <a className="button dark" href="#models">
              FIND MY VEHICLE →
            </a>
            <a className="textLink" href="sms:">
              TEXT JON →
            </a>
          </div>
        </div>
      </section>

      <section id="models" className="models shell">
        <div className="sectionTop">
          <div>
            <p className="eyebrow">EXPLORE THE LINEUP</p>
            <h2>Which model are you interested in?</h2>
          </div>
          <a className="textLink" href="#">
            VIEW ALL INVENTORY →
          </a>
        </div>

        <div className="modelGrid">
          {models.map((model) => (
            <a href="#" className="modelCard" key={model}>
              <div className="modelImage">
                <Image
                  src="/hero-defender.png"
                  alt={model}
                  fill
                  sizes="25vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className="modelMeta">
                <span>{model.toUpperCase()}</span>
                <span>→</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section id="about" className="split">
        <div className="splitCopy">
          <p className="eyebrow">A MORE PERSONAL APPROACH</p>
          <h2>
            Straight answers.
            <br />
            No pressure.
          </h2>
          <p>
            I&apos;ve spent years helping people buy and enjoy Jaguars and Land Rovers.
            Whether you know exactly what you want or just have a few questions,
            I&apos;ll help you figure it out.
          </p>
          <a className="button dark" href="sms:">
            ASK JON A QUESTION →
          </a>
        </div>

        <div className="splitVisual">
          <Image
            src="/hero-defender.png"
            alt="Luxury Land Rover detail"
            fill
            sizes="50vw"
            style={{ objectFit: "cover", objectPosition: "70% center" }}
          />
          <div className="quote">
            IT&apos;S MORE THAN A CAR.
            <br />
            IT&apos;S A DIFFERENT
            <br />
            PERSPECTIVE.
          </div>
        </div>
      </section>

      <section id="guides" className="finder">
        <div className="finderBg">
          <Image
            src="/hero-defender.png"
            alt="Land Rover mountain road"
            fill
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 65%" }}
          />
        </div>
        <div className="finderShade" />

        <div className="finderContent shell">
          <p className="eyebrow">LET&apos;S FIND YOURS</p>
          <h2>
            LOOKING FOR
            <br />
            SOMETHING SPECIFIC?
          </h2>
          <p>Tell me exactly what you want. I&apos;ll take it from there.</p>
          <div className="actions">
            <a className="button light" href="#">
              FIND MY VEHICLE →
            </a>
            <a className="textLink lightText" href="sms:">
              TEXT JON →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
