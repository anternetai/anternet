import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-brand-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const outfit = Outfit({
  variable: "--font-brand-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.drsqueegeeclt.com"),
  title: "Dr. Squeegee | Professional Pressure Washing Charlotte NC",
  description: "Charlotte's trusted pressure washing specialist. House washing, driveways, patios — done right, every time. Get your free quote today.",
  keywords: ["pressure washing Charlotte NC", "house washing Charlotte", "power washing Charlotte NC", "driveway cleaning Charlotte", "patio cleaning Charlotte NC", "pressure washing near me", "exterior cleaning Charlotte"],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Dr. Squeegee | Professional Pressure Washing Charlotte NC",
    description: "Charlotte's trusted pressure washing specialist. House washing, driveways, patios — done right, every time. Get your free quote today.",
    type: "website",
    url: "https://www.drsqueegeeclt.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${outfit.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
