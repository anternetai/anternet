import { NextRequest, NextResponse } from "next/server"

// POST /api/portal/dialer/twiml - TwiML webhook for outbound calls
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const to = formData.get("To") as string
    const callerId =
      (formData.get("CallerId") as string) ||
      process.env.TWILIO_PHONE_NUMBER ||
      "+19806896919"

    if (!to) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>No phone number provided.</Say>
</Response>`
      return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
      })
    }

    // Build TwiML to dial the number
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(callerId)}" timeout="30" record="record-from-answer-dual">
    <Number>${escapeXml(to)}</Number>
  </Dial>
</Response>`

    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    })
  } catch (err: any) {
    console.error("TwiML error:", err)
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>An error occurred. Please try again.</Say>
</Response>`
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    })
  }
}

// Also handle GET (some Twilio configurations may send GET)
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const to = url.searchParams.get("To")
  const callerId =
    url.searchParams.get("CallerId") ||
    process.env.TWILIO_PHONE_NUMBER ||
    "+19806896919"

  if (!to) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>No phone number provided.</Say>
</Response>`
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    })
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(callerId)}" timeout="30" record="record-from-answer-dual">
    <Number>${escapeXml(to)}</Number>
  </Dial>
</Response>`

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
