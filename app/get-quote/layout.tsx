import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dr. Squeegee | Charlotte Pressure Washing",
  description:
    "Professional pressure washing in Charlotte, NC. House washing, driveways, patios — done right, every time. Get your free quote today.",
  openGraph: {
    title: "Dr. Squeegee — Charlotte's Trusted Pressure Washing Pros",
    description:
      "House washing, driveways, patios — done right, every time. Free estimates.",
    siteName: "Dr. Squeegee",
    type: "website",
  },
}

export default function GetQuoteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white antialiased">
      {children}
    </div>
  )
}
