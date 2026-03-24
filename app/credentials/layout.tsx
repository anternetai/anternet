import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI-Native Lead Generation Technology | HomeField Hub",
  description:
    "See the technology stack and AI systems behind HomeField Hub. 5-layer quality assurance, automated lead qualification, and real-time market intelligence — built by an AI-native team.",
  openGraph: {
    title: "AI-Native Lead Generation Technology | HomeField Hub",
    description:
      "See the technology stack and AI systems behind HomeField Hub. 5-layer quality assurance, automated lead qualification, and real-time market intelligence.",
    url: "https://homefieldhub.com/credentials",
    siteName: "HomeField Hub",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function CredentialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
