import { createClient as createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { sendSms, toE164 } from "@/lib/telnyx"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/telnyx/sms - Send an SMS via Telnyx
 *
 * Body:
 *   - to: phone number (required)
 *   - text: message body (required)
 *   - from: sender number (optional, defaults to TELNYX_PHONE_NUMBER)
 *   - lead_id: link to a lead for conversation tracking (optional)
 */
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { to, text, from, lead_id } = body

    if (!to || !text) {
      return NextResponse.json(
        { error: "Both 'to' and 'text' are required" },
        { status: 400 }
      )
    }

    const result = await sendSms({
      to: toE164(to),
      from: from ? toE164(from) : undefined,
      text,
    })

    // Store in sms_conversations as an outbound message
    const admin = getAdmin()
    await admin.from("sms_conversations").insert({
      lead_id: lead_id || null,
      role: "assistant",
      content: text,
      phone_number: toE164(to),
      is_unknown_lead: !lead_id,
    })

    return NextResponse.json({
      success: true,
      messageId: result.id,
    })
  } catch (err) {
    console.error("Failed to send SMS via Telnyx:", err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
