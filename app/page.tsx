import TextJon from "./TextJon";
import "./jon-home.css";

const textRequest = `sms:+12156087408?body=${encodeURIComponent("Hi Jon, I found JonRover.com and would like to work directly with you on my next vehicle. My name is ")}`;
const callJon = "tel:+16092218478";

export default function Home() {
  return (
    <main className="jrSite" id="top">
      <header className="jrTop jrWrap">
        <a className="jrLogo" href="#top" aria-label="Jon Rover, back to top">JON ROVER</a>
        <div className="jrTopRight">
          <span className="jrTopNote">THE PERSONAL SIDE OF AUTOMOTIVE</span>
          <a className="jrTopButton" href="#contact">WORK WITH JON <span aria-hidden="true">↗</span></a>
        </div>
      </header>
      <section className="jrIntro" aria-labelledby="hero-title">
        <div className="jrHero jrWrap">
          <div className="jrHeroCopy">
            <p className="jrKicker">JON MCGEEHAN · AUTOMOTIVE SPECIALIST</p>
            <h1 id="hero-title">YOUR NEXT CAR. <span>MORE PERSONAL.</span></h1>
            <p className="jrHeroLead">
              Skip the noise. If you’re considering a Range Rover, Defender, or your next luxury SUV,
              work directly with someone who knows the vehicles and takes the time to understand you.
            </p>
            <div className="jrActions">
              <a className="jrButton jrButtonPrimary" href="#contact">REQUEST TO WORK WITH JON <span aria-hidden="true">↗</span></a>
              <a className="jrButton jrButtonSecondary" href="#about">GET TO KNOW ME <span aria-hidden="true">↓</span></a>
            </div>
            <p className="jrMicro">No inventory feeds. No complicated process. Just a direct conversation.</p>
          </div>
          <div className="jrPhotoWrap">
            <img className="jrPortrait" src="/jon-bio.PNG" alt="Jon McGeehan, the person behind Jon Rover" />
            <span className="jrPhotoCorner">A REAL PERSON. A DIRECT CONNECTION.</span>
            <span className="jrPhotoIndex" aria-hidden="true">01 / THE PERSON BEHIND THE PAGE</span>
          </div>
        </div>
      </section>
      <div className="jrBand">
        <div className="jrBandInner jrWrap">
          <span>PERSONAL SERVICE</span><span>LUXURY SUVs</span><span>STRAIGHT ANSWERS</span><span>PHILADELPHIA + SOUTH JERSEY</span>
        </div>
      </div>
      <section className="jrAbout jrWrap" id="about" aria-labelledby="about-title">
        <p className="jrLabel">01 / ABOUT JON</p>
        <div>
          <h2 id="about-title">The experience should be about you.</h2>
          <p>I'm <strong>Jon McGeehan</strong> — the voice behind Jon Rover. I spend my days around exceptional vehicles, but what matters most to me is helping people feel confident about a big decision.</p>
          <p>I share real-world car knowledge online and help people navigate their next vehicle personally. Whether you're just starting to explore or know exactly what you want, <strong>you can talk to me directly.</strong></p>
          <div className="jrValues">
            <div><span className="jrNumeral">01</span><h3>REAL ANSWERS</h3><p>Questions are welcome, even when you're not ready to buy.</p></div>
            <div><span className="jrNumeral">02</span><h3>ONE POINT OF CONTACT</h3><p>Start with a conversation with me, not an automated sales funnel.</p></div>
            <div><span className="jrNumeral">03</span><h3>A PERSONAL APPROACH</h3><p>We'll focus on what matters to you, not a generic sales pitch.</p></div>
          </div>
        </div>
      </section>
      <section className="jrContact" id="contact" aria-labelledby="contact-title">
        <div className="jrContactGrid jrWrap">
          <div>
            <p className="jrLabel">02 / THE NEXT STEP</p>
            <h2 id="contact-title">LET'S FIND YOUR NEXT MOVE.</h2>
            <p>Looking for a vehicle or simply want advice from someone who works with luxury SUVs every day? Send me a quick text and tell me what you're looking for. I'll take it from there.</p>
          </div>
          <div className="jrContactActions">
            <TextJon href={textRequest} className="jrButton jrButtonPrimary">REQUEST TO WORK WITH JON <span aria-hidden="true">↗</span></TextJon>
            <a href={callJon} className="jrButton jrButtonSecondary">PREFER TO CALL? <span>609-221-8478 ↗</span></a>
            <small>On a phone, the request opens your messaging app with a draft text. You choose whether to send it. On desktop, scan the QR code to text me. No inquiry form or database required.</small>
          </div>
        </div>
      </section>
      <footer className="jrFooter">
        <div className="jrWrap">
          <div className="jrFooterTop">
            <a className="jrLogo" href="#top">JON ROVER</a>
            <nav className="jrFooterLinks" aria-label="Footer navigation">
              <a href="#about">ABOUT</a>
              <a href="#contact">WORK WITH JON</a>
              <a href="/privacy">PRIVACY</a>
              <a href="/terms">TERMS</a>
            </nav>
          </div>
          <p className="jrLegalNote">© {new Date().getFullYear()} Jon McGeehan. This is Jon's personal website, not an official website of Jaguar Land Rover or any vehicle retailer. Brand names mentioned are the property of their respective owners. Any vehicle sale or lease is handled through an authorized retailer, subject to its policies and approvals.</p>
        </div>
      </footer>
    </main>
  );
}
