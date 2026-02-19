import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import {
  parseWebhookEvent,
  mapCallEventToStatus,
  verifyWebhookSignature,
} from "@/lib/telnyx"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * POST /api/telnyx/webhooks/call-events
 *
 * Receives Telnyx call control webhook events and updates telnyx_call_logs.
 * Events include: call.initiated, call.ringing, call.answered, call.hangup,
 * call.recording.saved, etc.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Verify webhook signature
    const signature = req.headers.get("telnyx-signature-ed25519")
    const timestamp = req.headers.get("telnyx-timestamp")

    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
      console.error("Telnyx webhook signature verification failed")
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    const body = JSON.parse(rawBody)
    const event = parseWebhookEvent(body)

    console.log(`[Telnyx Call Event] ${event.eventType}`, {
      callControlId: event.payload.call_control_id,
      callSessionId: event.payload.call_session_id,
    })

    const admin = getAdmin()
    const callControlId = event.payload.call_control_id as string
    const callSessionId = event.payload.call_session_id as string
    const callLegId = event.payload.call_leg_id as string

    // Map event type to our internal status
    const status = mapCallEventToStatus(event.eventType)

    switch (event.eventType) {
      case "call.initiated": {
        // Create a new call log entry
        const direction =
          (event.payload.direction as string) === "incoming"
            ? "inbound"
            : "outbound"
        const fromNumber = event.payload.from as string
        const toNumber = event.payload.to as string

        // Try to find a linked lead by phone number
        const phoneToMatch = direction === "inbound" ? fromNumber : toNumber
        let leadId: string | null = null

        if (phoneToMatch) {
          // Check dialer_leads first
          const { data: dialerLead } = await admin
            .from("dialer_leads")
            .select("id")
            .eq("phone_number", phoneToMatch)
            .limit(1)
            .single()

          if (dialerLead) {
            leadId = dialerLead.id
          }
        }

        const { error } = await admin.from("telnyx_call_logs").insert({
          telnyx_call_control_id: callControlId,
          telnyx_call_session_id: callSessionId,
          telnyx_call_leg_id: callLegId,
          direction,
          from_number: fromNumber,
          to_number: toNumber,
          status: "initiated",
          lead_id: leadId,
          metadata: { initiated_event: event.payload },
        })

        if (error) console.error("Failed to insert call log:", error)
        break
      }

      case "call.ringing":
      case "call.answered":
      case "call.bridged": {
        if (status) {
          const { error } = await admin
            .from("telnyx_call_logs")
            .update({ status })
            .eq("telnyx_call_control_id", callControlId)

          if (error) console.error(`Failed to update call status to ${status}:`, error)
        }
        break
      }

      case "call.hangup": {
        // Call ended — update status and calculate duration
        const hangupCause = event.payload.hangup_cause as string
        const hangupSource = event.payload.hangup_source as string
        const startTime = event.payload.start_time as string
        const endTime = event.payload.end_time as string

        let duration = 0
        if (startTime && endTime) {
          duration = Math.floor(
            (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000
          )
        }

        // Determine final status from hangup cause
        let finalStatus: string = "completed"
        if (hangupCause === "CALL_REJECTED") finalStatus = "busy"
        else if (hangupCause === "NO_ANSWER" || hangupCause === "ORIGINATOR_CANCEL")
          finalStatus = "no_answer"
        else if (hangupCause === "UNALLOCATED_NUMBER") finalStatus = "failed"

        const { error } = await admin
          .from("telnyx_call_logs")
          .update({
            status: finalStatus,
            duration,
            metadata: {
              hangup_cause: hangupCause,
              hangup_source: hangupSource,
              start_time: startTime,
              end_time: endTime,
            },
          })
          .eq("telnyx_call_control_id", callControlId)

        if (error) console.error("Failed to update call hangup:", error)
        break
      }

      case "call.recording.saved": {
        // Recording is ready — store the URL
        const recordingUrls = event.payload.recording_urls as Record<
          string,
          string
        > | undefined
        const recordingId = event.payload.recording_id as string

        const recordingUrl =
          recordingUrls?.mp3 || recordingUrls?.wav || null

        if (recordingUrl) {
          const { error } = await admin
            .from("telnyx_call_logs")
            .update({
              recording_url: recordingUrl,
              recording_id: recordingId,
            })
            .eq("telnyx_call_control_id", callControlId)

          if (error)
            console.error("Failed to update recording URL:", error)
        }
        break
      }

      case "call.machine.detection.ended": {
        // AMD result — could be human, machine, or not_sure
        const result = event.payload.result as string
        // Update metadata with AMD result
        const { data: existing } = await admin
          .from("telnyx_call_logs")
          .select("metadata")
          .eq("telnyx_call_control_id", callControlId)
          .single()

        const metadata = {
          ...(existing?.metadata as Record<string, unknown> || {}),
          amd_result: result,
        }

        await admin
          .from("telnyx_call_logs")
          .update({ metadata })
          .eq("telnyx_call_control_id", callControlId)
        break
      }

      default:
        console.log(`[Telnyx] Unhandled event type: ${event.eventType}`)
    }

    // Telnyx expects a 200 response
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("Telnyx call webhook error:", err)
    // Still return 200 to prevent Telnyx from retrying
    return NextResponse.json({ error: "Processing failed" }, { status: 200 })
  }
}
