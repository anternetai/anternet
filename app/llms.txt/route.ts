import { NextResponse } from "next/server"

const LLMS_TXT = `# HomeField Hub

> AI-powered lead generation for home service contractors. We run Facebook ads, qualify leads with AI, and book appointments. Contractors pay $200 per showed appointment with $50/day ad spend — no retainer, no risk.

## What We Do
- [Homepage](https://homefieldhub.com/index.md): Overview of HomeField Hub's lead generation platform
- [Blog](https://homefieldhub.com/blog.md): Marketing tips and insights for home service contractors

## How It Works
1. We run targeted Facebook ads in your service area
2. AI qualifies every lead automatically
3. Qualified leads get booked directly on your calendar
4. You only pay for appointments that actually show up

## Pricing
- $200 per showed appointment
- $50/day ad spend (paid to Meta directly)
- No retainer, no setup fee, no long-term contract

## Industries
- Roofing, HVAC, Plumbing, Electrical, Landscaping, Painting, Pressure Washing, Remodeling, and more

## Legal
- [Privacy Policy](https://homefieldhub.com/privacy.md)
- [Terms of Service](https://homefieldhub.com/terms.md)

## Contact
- Website: https://homefieldhub.com
- Email: support@homefieldhub.com
`

export function GET() {
  return new NextResponse(LLMS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  })
}
