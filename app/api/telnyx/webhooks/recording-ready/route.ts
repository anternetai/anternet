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
 * POST /api/telnyx/webhooks/recording-ready
 *
 * Receives Telnyx recording.completed events.
 * Updates the call log with the download URL.
 *
 * Note: Most recording events are handled by the call-events webhook
 * via call.recording.saved. This endpoint handles standalone recording
 * events and serves as a fallback.
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

    console.log(`[Telnyx Recording Event] ${event.eventType}`, {
      recordingId: event.payload.id,
    })

    if (
      event.eventType === "recording.completed" ||
      event.eventType === "call.recording.saved"
    ) {
      const admin = getAdmin()

      const callSessionId = event.payload.call_session_id as string
      const callControlId = event.payload.call_control_id as string
      const recordingId = (event.payload.id || event.payload.recording_id) as string

      // Try to get download URLs
      const downloadUrls = event.payload.download_urls as
        | Record<string, string>
        | undefined
      const recordingUrl =
        downloadUrls?.mp3 || downloadUrls?.wav || null

      const durationMillis = (event.payload.duration_millis as number) || 0
      const durationSeconds = Math.floor(durationMillis / 1000)

      if (recordingUrl) {
        // Try to match by call_control_id first, then call_session_id
        const matchField = callControlId
          ? "telnyx_call_control_id"
          : "telnyx_call_session_id"
        const matchValue = callControlId || callSessionId

        const { error } = await admin
          .from("telnyx_call_logs")
          .update({
            recording_url: recordingUrl,
            recording_id: recordingId,
            // Update duration if we didn't get it from the hangup event
            ...(durationSeconds > 0 ? { duration: durationSeconds } : {}),
          })
          .eq(matchField, matchValue)

        if (error) {
          console.error("Failed to update recording in call log:", error)
        } else {
          console.log(
            `[Telnyx] Recording saved for ${matchField}=${matchValue}`
          )
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("Telnyx recording webhook error:", err)
    return NextResponse.json({ error: "Processing failed" }, { status: 200 })
  }
}
