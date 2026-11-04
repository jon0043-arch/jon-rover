import Link from "next/link";
import "../legal.css";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPolicy() {
  return <main className="legalPage"><div className="legalShell">
    <Link className="legalBack" href="/">← JON ROVER</Link>
    <p className="legalEyebrow">LEGAL</p><h1>Privacy Policy</h1>
    <p className="legalUpdated">Updated November 4, 2026</p>
    <p>JonRover.com is a personal automotive website operated by Jon McGeehan. This policy explains what information may be processed when you visit this site or contact Jon.</p>
    <h2>Contact requests</h2>
    <p>The website's contact buttons open your device's text messaging app or telephone dialer. The site does not automatically send messages or collect your inquiry through an on-site lead form. If you decide to call or send a text, your carrier and messaging provider process that communication, and Jon receives the information you choose to share.</p>
    <h2>Technical information</h2>
    <p>Like most websites, the hosting provider may process technical information such as IP addresses, request times, browser or device details, and security logs to operate and protect the site. The site may use hosting performance and security services. No advertising-tracking or lead-storage service is intentionally integrated into this landing page.</p>
    <h2>How communications are used</h2>
    <p>Information you choose to send Jon may be used to answer your questions, respond to your request, and communicate about your automotive interests. Any vehicle transaction is conducted through the applicable retailer and governed by its privacy disclosures.</p>
    <h2>Sharing and retention</h2>
    <p>Information may be handled by telecommunications providers, hosting providers, and, if needed for a vehicle inquiry, the applicable retailer. Information may also be disclosed where required by law. Communications may be retained as needed for follow-up, recordkeeping, legal requirements, and legitimate business purposes.</p>
    <h2>Your choices</h2>
    <p>You may browse without contacting Jon. If you text Jon, you control whether to send the drafted message. To request access, correction, or deletion of contact information, where applicable, contact Jon using the methods shown on the homepage.</p>
    <h2>Changes</h2>
    <p>This policy may change as the website's features or service providers change. The update date above will reflect material revisions.</p>
    <div className="legalFooter"><Link href="/terms">Terms</Link><Link href="/">Back to Jon Rover</Link></div>
  </div></main>;
}
