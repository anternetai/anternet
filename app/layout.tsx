import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dr. Squeegee House Washing | Charlotte NC Pressure Washing",
  description: "Professional house washing and pressure washing services in Charlotte, NC. Soft wash safe for all siding types. Driveways, windows, gutters, and more. Free quotes, same-week appointments.",
  keywords: ["house washing Charlotte", "pressure washing Charlotte NC", "soft wash", "driveway cleaning", "gutter cleaning Charlotte"],
  openGraph: {
    title: "Dr. Squeegee House Washing | Charlotte NC",
    description: "Professional house washing services. Safe soft wash for all siding types. Free quotes available.",
    type: "website",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
