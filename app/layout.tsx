import "./globals.css";
import "./hero-position.css";
import "./about-section.css";
import "./reviews-section.css";
import "./inventory-section.css";
import "./hero-search-clean.css";
import "./concierge.css";
import "./crm.css";

export const metadata = {
  title: "Jon Rover | Jaguar Land Rover Willow Grove",
  description:
    "A more personal way to buy Jaguar and Land Rover in Willow Grove, PA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
