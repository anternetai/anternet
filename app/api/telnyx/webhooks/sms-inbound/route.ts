import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { parseWebhookEvent, verifyWebhookSignature } from "@/lib/telnyx"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/telnyx/webhooks/sms-inbound
 *
 * Receives inbound SMS messages from Telnyx and stores them in
 * the sms_conversations table (existing table for lead conversations).
 *
 * Event types: message.received, message.sent, message.finalized
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    const signature = req.headers.get("telnyx-signature-ed25519")
    const timestamp = req.headers.get("telnyx-timestamp")

    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    const body = JSON.parse(rawBody)
    const event = parseWebhookEvent(body)

    console.log(`[Telnyx SMS Event] ${event.eventType}`, {
      from: (event.payload.from as Record<string, unknown>)?.phone_number || event.payload.from,
      to: event.payload.to,
    })

    if (event.eventType === "message.received") {
      const admin = getAdmin()

      // Parse the SMS payload
      const fromRaw = event.payload.from as Record<string, unknown> | string | undefined
      const fromNumber =
        typeof fromRaw === "string"
          ? fromRaw
          : (fromRaw as Record<string, unknown>)?.phone_number as string || ""
      const toArray = event.payload.to as
        | { phone_number: string }[]
        | undefined
      const toNumber = toArray?.[0]?.phone_number || ""
      const text = (event.payload.text as string) || ""

      if (!fromNumber || !text) {
        return NextResponse.json({ received: true })
      }

      // Try to find the lead by phone number
      let leadId: string | null = null
      let isUnknown = true

      // Check agency_leads
      const { data: lead } = await admin
        .from("agency_leads")
        .select("id")
        .eq("phone", fromNumber)
        .limit(1)
        .single()

      if (lead) {
        leadId = lead.id
        isUnknown = false
      } else {
        // Check dialer_leads
        const { data: dialerLead } = await admin
          .from("dialer_leads")
          .select("id")
          .eq("phone_number", fromNumber)
          .limit(1)
          .single()

        if (dialerLead) {
          leadId = dialerLead.id
          isUnknown = false
        }
      }

      // Store the message in sms_conversations
      const { error } = await admin.from("sms_conversations").insert({
        lead_id: leadId,
        role: "user",
        content: text,
        phone_number: fromNumber,
        is_unknown_lead: isUnknown,
      })

      if (error) {
        console.error("Failed to store inbound SMS:", error)
      } else {
        console.log(
          `[Telnyx] Inbound SMS from ${fromNumber} stored (lead: ${leadId || "unknown"})`
        )
      }
    }

    // Handle outbound message status updates
    if (
      event.eventType === "message.sent" ||
      event.eventType === "message.finalized"
    ) {
      const status = event.payload.status as string
      const messageId = event.payload.id as string
      console.log(
        `[Telnyx] Outbound SMS ${messageId} status: ${status}`
      )
      // Could update a message status field if needed in the future
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("Telnyx SMS webhook error:", err)
    return NextResponse.json({ error: "Processing failed" }, { status: 200 })
  }
}
