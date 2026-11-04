import Link from "next/link";
import "../legal.css";

export const metadata = { title: "Terms of Use" };

export default function Terms() {
  return <main className="legalPage"><div className="legalShell">
    <Link className="legalBack" href="/">← JON ROVER</Link>
    <p className="legalEyebrow">LEGAL</p><h1>Terms of Use</h1>
    <p className="legalUpdated">Updated November 4, 2026</p>
    <p>JonRover.com is Jon McGeehan's personal automotive information and contact website. By using it, you agree to these terms.</p>
    <h2>Independent personal website</h2>
    <p>This is not an official website of Jaguar Land Rover, any vehicle manufacturer, lender, or retailer. Brand and model references are descriptive and do not imply endorsement, sponsorship, or authorization.</p>
    <h2>No vehicle transaction on this site</h2>
    <p>The website does not offer inventory, quotes, financing, credit applications, reservations, or a binding offer to buy or lease any vehicle. Nothing on the site creates a customer agreement with a retailer. Any purchase or lease must be handled separately with the applicable authorized retailer under its own terms.</p>
    <h2>Contacting Jon</h2>
    <p>The request button opens your SMS app with a draft message. You choose whether to send it. Calls and texts may be subject to charges from your carrier. Sending a message does not guarantee a response time, vehicle availability, or a transaction.</p>
    <h2>Accuracy</h2>
    <p>Information is general and may change. Always confirm relevant vehicle specifications, pricing, availability and terms with the appropriate retailer before deciding.</p>
    <h2>Third-party rights</h2>
    <p>Names and trademarks of vehicle manufacturers and retailers are the property of their respective owners. This site does not claim ownership of them.</p>
    <h2>Third-party links and availability</h2>
    <p>Any link to a third-party service is subject to that service's terms and privacy practices. We may change or discontinue the site without notice.</p>
    <h2>Contact</h2>
    <p>For questions, use the contact methods on the homepage.</p>
    <div className="legalFooter"><Link href="/privacy">Privacy Policy</Link><Link href="/">Back to Jon Rover</Link></div>
  </div></main>;
}
