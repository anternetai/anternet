import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watch Before Your Call | HomeField Hub",
  description:
    "Watch this short video before your strategy call with HomeField Hub.",
  robots: { index: false, follow: false },
};

export default function CallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
