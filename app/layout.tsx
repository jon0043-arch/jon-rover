import "./globals.css";

export const metadata = {
  title: "Jon McGeehan | Jaguar Land Rover Willow Grove",
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
