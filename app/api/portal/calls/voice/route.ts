import { NextRequest, NextResponse } from "next/server"

// POST /api/portal/calls/voice — TwiML webhook for Twilio Voice
// Twilio calls this when an outbound call is initiated from the browser SDK
// It tells Twilio to dial the target phone number
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const to = formData.get("To") as string
  const callerId = process.env.TWILIO_CALLER_ID || formData.get("From") as string

  if (!to) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>No phone number provided.</Say>
</Response>`
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
    })
  }

  // Format phone number for Twilio (must be E.164)
  let formattedNumber = to.replace(/\D/g, "")
  if (formattedNumber.length === 10) {
    formattedNumber = `+1${formattedNumber}`
  } else if (formattedNumber.length === 11 && formattedNumber.startsWith("1")) {
    formattedNumber = `+${formattedNumber}`
  } else if (!formattedNumber.startsWith("+")) {
    formattedNumber = `+${formattedNumber}`
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${callerId || formattedNumber}" timeout="30" record="record-from-answer-dual">
    <Number>${formattedNumber}</Number>
  </Dial>
</Response>`

  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  })
}
