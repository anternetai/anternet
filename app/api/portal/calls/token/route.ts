import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/portal/calls/token — generate Twilio capability token for browser SDK
// Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_TWIML_APP_SID
export async function GET() {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID
  const callerId = process.env.TWILIO_CALLER_ID // Your Twilio phone number

  if (!accountSid || !authToken || !twimlAppSid) {
    return NextResponse.json(
      {
        error: "Twilio not configured",
        configured: false,
        missing: [
          !accountSid && "TWILIO_ACCOUNT_SID",
          !authToken && "TWILIO_AUTH_TOKEN",
          !twimlAppSid && "TWILIO_TWIML_APP_SID",
        ].filter(Boolean),
      },
      { status: 503 }
    )
  }

  try {
    // Dynamically import twilio to avoid build errors if not installed
    const twilio = await import("twilio")
    const AccessToken = twilio.jwt.AccessToken
    const VoiceGrant = AccessToken.VoiceGrant

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: false,
    })

    const token = new AccessToken(accountSid, process.env.TWILIO_API_KEY_SID!, process.env.TWILIO_API_KEY_SECRET!, {
      identity: "power-dialer",
      ttl: 3600,
    })
    token.addGrant(voiceGrant)

    return NextResponse.json({
      token: token.toJwt(),
      configured: true,
      callerId: callerId || null,
    })
  } catch (e: unknown) {
    // If twilio module not installed, return graceful fallback
    const message = e instanceof Error ? e.message : String(e)
    if (message.includes("Cannot find module") || message.includes("MODULE_NOT_FOUND")) {
      return NextResponse.json(
        {
          error: "Twilio SDK not installed. Run: npm install twilio",
          configured: false,
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: message, configured: false }, { status: 500 })
  }
}
