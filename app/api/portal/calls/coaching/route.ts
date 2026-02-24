/**
 * GET /api/portal/calls/coaching?recording_id=<uuid>
 *
 * Returns coaching analysis for a specific call recording.
 * Compares against the HomeField Hub Face-Melter cold call script.
 * Grades: tonality, pacing, objection handling, close attempt.
 *
 * If coaching not yet generated, runs AI analysis on-demand.
 */

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { CoachingResponse } from "@/lib/dialer/ai-types"
import { runAIAnalysis } from "@/lib/dialer/ai-analysis"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest): Promise<NextResponse<CoachingResponse | { error: string }>> {
  // Auth
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const recordingId = url.searchParams.get("recording_id")

  if (!recordingId) {
    return NextResponse.json({ error: "recording_id query param is required" }, { status: 400 })
  }

  const admin = getAdmin()

  // Fetch the recording
  const { data: recording, error } = await admin
    .from("call_recordings")
    .select("*")
    .eq("id", recordingId)
    .single()

  if (error || !recording) {
    return NextResponse.json({ error: "Recording not found" }, { status: 404 })
  }

  // Fetch lead context if available
  let leadContext: {
    businessName: string | null
    ownerName: string | null
    state: string | null
    attemptCount: number
  } | undefined = undefined
  if (recording.lead_id) {
    const { data: lead } = await admin
      .from("dialer_leads")
      .select("business_name, owner_name, state, attempt_count")
      .eq("id", recording.lead_id)
      .single()

    if (lead) {
      leadContext = {
        businessName: (lead.business_name as string) || null,
        ownerName: (lead.owner_name as string) || null,
        state: (lead.state as string) || null,
        attemptCount: (lead.attempt_count as number) || 0,
      }
    }
  }

  // Return existing coaching if already generated
  if (recording.ai_coaching) {
    return NextResponse.json({
      recordingId,
      coaching: recording.ai_coaching,
      rawTranscript: recording.raw_transcript,
      leadContext,
    })
  }

  // If no coaching yet but we have a transcript, generate on-demand
  if (!recording.raw_transcript) {
    return NextResponse.json({ error: "No transcript available for this recording. Transcribe first." }, { status: 422 })
  }

  const analysis = await runAIAnalysis({
    transcript: recording.raw_transcript as string,
    leadId: recording.lead_id || undefined,
    businessName: leadContext?.businessName || undefined,
    ownerName: leadContext?.ownerName || undefined,
    state: leadContext?.state || undefined,
  })

  // Save coaching back to the recording
  await admin
    .from("call_recordings")
    .update({
      ai_coaching: analysis.coaching,
      ai_summary: recording.ai_summary || analysis.summary,
      ai_disposition: recording.ai_disposition || analysis.disposition,
      ai_follow_up_recommendation: recording.ai_follow_up_recommendation || analysis.followUpRecommendation,
      ai_notes: recording.ai_notes || analysis.autoNotes,
      processed_at: new Date().toISOString(),
    })
    .eq("id", recordingId)

  return NextResponse.json({
    recordingId,
    coaching: analysis.coaching,
    rawTranscript: recording.raw_transcript as string,
    leadContext,
  })
}
