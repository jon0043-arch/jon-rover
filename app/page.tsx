"use client";

import FeaturedVehicles from "./FeaturedVehicles";
import TextJon from "./TextJon";

const JON_TEXT_NUMBER = "+12156087408";
const JON_CALL_NUMBER = "tel:+16092218478";
const JON_CALL_DISPLAY = "609-221-8478";
const FIND_SMS = `sms:${JON_TEXT_NUMBER}?body=${encodeURIComponent("Hi Jon, I found you through Jon Rover. I’m looking for a Range Rover / Land Rover and want some help finding the right one.")}`;
const GENERAL_SMS = `sms:${JON_TEXT_NUMBER}?body=${encodeURIComponent("Hi Jon, I found you through Jon Rover and wanted to reach out.")}`;

export default function Home() {
  return (
    <main>
      <section className="hero" id="home">
        <div className="heroImage">
          <picture>
            <source media="(max-width: 620px)" srcSet="/hero-mobile.PNG" />
            <img src="/hero-defender.png" alt="Land Rover Defender overlooking the mountains" />
          </picture>
        </div>
        <div className="heroShade" />

        <header className="nav shell">
          <a href="#home" className="brandLockup">
            <span className="brand">JON ROVER</span>
            <span className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</span>
          </a>

          <nav className="desktopNav" aria-label="Primary navigation">
            <a href="#featured">FEATURED</a>
            <a href="/deal-check">DEAL CHECK</a>
          </nav>

          <TextJon className="pill dark" href={GENERAL_SMS}>TEXT JON</TextJon>
        </header>

        <div className="heroCopy shell" style={{ maxWidth: 900 }}>
          <p className="eyebrow heroKicker">BUYING A RANGE ROVER?</p>
          <h1 style={{ maxWidth: 820 }}>I&apos;LL HELP<br />YOU FIND<br />THE RIGHT ONE.</h1>
          <p className="heroLead" style={{ maxWidth: 600 }}>
            No giant inventory maze. No dealership runaround. Tell me what you&apos;re looking for and I&apos;ll help you narrow it down.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            <TextJon className="button dark" href={FIND_SMS}>HELP ME FIND ONE →</TextJon>
            <a className="button" href="/deal-check" style={{ background: "rgba(242,238,230,.72)", backdropFilter: "blur(10px)" }}>
              CHECK MY DEAL →
            </a>
          </div>
        </div>
      </section>

      <section className="shell" style={{ padding: "clamp(60px,8vw,110px) 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(30px,7vw,100px)", alignItems: "center" }} className="simpleIntro">
          <div>
            <p className="eyebrow">WHAT THIS SITE IS FOR</p>
            <h2 style={{ fontSize: "clamp(44px,6vw,86px)", lineHeight: .92, fontWeight: 300, letterSpacing: ".02em", margin: "12px 0 24px" }}>
              LESS WEBSITE.<br />MORE HELP.
            </h2>
          </div>
          <div style={{ maxWidth: 560 }}>
            <p style={{ fontSize: 16, lineHeight: 1.75, marginTop: 0 }}>
              If you saw one of my videos, want help finding a Land Rover, or want a second set of eyes on a deal, you&apos;re in the right place.
            </p>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 24 }}>
              <TextJon className="textLink" href={GENERAL_SMS}>TEXT JON →</TextJon>
              <a className="textLink" href={JON_CALL_NUMBER}>CALL JON →</a>
            </div>
          </div>
        </div>
      </section>

      <FeaturedVehicles />

      <section className="homeDealCheck">
        <div className="homeDealCheckVisual">
          <img src="/rangeroversport-hero.png" alt="Range Rover Sport" />
          <div className="homeDealCheckVisualShade" />
          <div className="homeDealCheckStamp"><span>DEAL</span><b>CHECK</b></div>
        </div>
        <div className="homeDealCheckPanel">
          <p className="eyebrow">ALREADY HAVE A QUOTE?</p>
          <h2>DON&apos;T<br />SIGN YET.</h2>
          <p className="homeDealCheckLead">
            Upload a screenshot of the deal you were given. I&apos;ll help you look at the numbers before you make a decision.
          </p>
          <a className="homeDealCheckButton" href="/deal-check">
            <span>CHECK MY DEAL</span><b>→</b>
          </a>
          <small>UPLOAD THE SCREENSHOT · GET A SECOND SET OF EYES</small>
        </div>
      </section>

      <section id="about" className="personalAbout">
        <div className="personalAboutInner shell">
          <div className="personalPortraitWrap">
            <img className="personalPortrait" src="/jon-bio.PNG" alt="Jon McGeehan" />
          </div>
          <div className="personalAboutCopy">
            <p className="eyebrow">JON McGEEHAN</p>
            <h2>Need help?</h2>
            <p className="personalRole">JAGUAR LAND ROVER WILLOW GROVE</p>
            <p className="personalIntro">
              Send me what you&apos;re looking for, the car you saw in one of my videos, or the deal you&apos;re considering. I&apos;ll point you in the right direction.
            </p>
            <div className="personalAboutActions">
              <TextJon className="button dark" href={GENERAL_SMS}>TEXT JON →</TextJon>
              <a className="textLink" href={JON_CALL_NUMBER}>CALL {JON_CALL_DISPLAY} →</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer shell">
        <div>
          <div className="brand">JON ROVER</div>
          <div className="eyebrow">JAGUAR LAND ROVER WILLOW GROVE</div>
        </div>
        <p><a href={JON_CALL_NUMBER}>{JON_CALL_DISPLAY}</a></p>
        <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/deal-check" style={{ fontSize: 10, letterSpacing: ".12em" }}>DEAL CHECK</a>
          <a href="/blog" style={{ fontSize: 10, letterSpacing: ".12em" }}>BLOG</a>
          <a href="/privacy" style={{ fontSize: 10, letterSpacing: ".12em" }}>PRIVACY</a>
          <a href="/terms" style={{ fontSize: 10, letterSpacing: ".12em" }}>TERMS</a>
          <TextJon className="pill dark" href={GENERAL_SMS}>TEXT JON</TextJon>
        </div>
      </footer>

      <style jsx global>{`
        @media(max-width:900px){
          .simpleIntro{grid-template-columns:1fr!important}
          .desktopNav{display:none!important}
        }
        @media(max-width:620px){
          .heroCopy{padding-top:16vh!important}
          .heroCopy h1{font-size:clamp(48px,13.5vw,64px)!important}
          .heroCopy .button{width:100%}
          .nav .pill{min-height:42px;padding:0 14px;font-size:8px}
          .simpleIntro{gap:12px!important}
        }
      `}</style>
    </main>
  );
}
