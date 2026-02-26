import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dr. Squeegee | Professional House Washing",
  description: "Professional house washing services in Charlotte, NC",
  openGraph: {
    title: "Dr. Squeegee",
    description: "Professional House Washing",
    siteName: "Dr. Squeegee",
    type: "website",
  },
}

export default function CallLayout({ children }: { children: React.ReactNode }) {
  return children
}
