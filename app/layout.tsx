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
  metadataBase: new URL("https://homefieldhub.com"),
  title: "HomeField Hub | AI Lead Generation for Home Service Contractors",
  description:
    "Performance-based lead generation for roofing and remodeling contractors. Pay $200 per showed appointment. No retainer, no contracts, no risk.",
  keywords: [
    "lead generation",
    "roofing leads",
    "home service leads",
    "AI lead generation",
    "pay per appointment",
    "roofing contractor leads",
    "remodeling leads",
  ],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "HomeField Hub | AI Lead Generation for Home Service Contractors",
    description:
      "Performance-based lead generation for roofing and remodeling contractors. Pay $200 per showed appointment. No retainer, no contracts, no risk.",
    url: "https://homefieldhub.com",
    siteName: "HomeField Hub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HomeField Hub | AI Lead Generation for Home Service Contractors",
    description:
      "Performance-based lead generation for roofing and remodeling contractors. Pay $200 per showed appointment.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "https://homefieldhub.com",
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
