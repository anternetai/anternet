/**
 * POST /api/portal/calls/analyze
 *
 * Takes a transcript + lead context, runs full AI analysis:
 *   a) Auto-determine disposition
 *   b) Recommend follow-up timing
 *   c) Generate coaching tips based on Face-Melter cold call script
 *   d) Auto-generate call notes
 *
 * Body (JSON):
 * {
 *   transcript: string         — required
 *   recording_id?: string      — optional, to update existing call_recordings row
 *   lead_id?: string
 *   business_name?: string
 *   owner_name?: string
 *   state?: string
 *   lead_context?: string      — freeform context string
 *   duration_seconds?: number
 * }
 *
 * Returns: AnalyzeResponse
 */

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/dialer/ai-types"
import { runAIAnalysis } from "@/lib/dialer/ai-analysis"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest): Promise<NextResponse<AnalyzeResponse | { error: string }>> {
  // Auth
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json() as AnalyzeRequest

  if (!body.transcript || body.transcript.trim().length < 10) {
    return NextResponse.json({ error: "transcript is required and must be at least 10 characters" }, { status: 400 })
  }

  const admin = getAdmin()

  // ── Build lead context from DB if leadId provided ─────────────────────────
  let businessName = body.businessName
  let ownerName = body.ownerName
  let state = body.state

  if (body.leadId && (!businessName || !ownerName)) {
    const { data: lead } = await admin
      .from("dialer_leads")
      .select("business_name, owner_name, state, attempt_count, notes")
      .eq("id", body.leadId)
      .single()
    if (lead) {
      businessName = businessName || (lead.business_name as string) || undefined
      ownerName = ownerName || (lead.owner_name as string) || undefined
      state = state || (lead.state as string) || undefined
    }
  }

  // ── Run AI analysis ───────────────────────────────────────────────────────
  const analysis = await runAIAnalysis({
    transcript: body.transcript,
    leadId: body.leadId,
    businessName,
    ownerName,
    state,
    leadContext: body.leadContext,
    durationSeconds: body.durationSeconds,
  })

  // ── Save / update call_recordings row ─────────────────────────────────────
  let recordingId = body.recordingId

  if (recordingId) {
    // Update existing row
    await admin
      .from("call_recordings")
      .update({
        raw_transcript: body.transcript,
        ai_summary: analysis.summary,
        ai_disposition: analysis.disposition,
        ai_coaching: analysis.coaching,
        ai_follow_up_recommendation: analysis.followUpRecommendation,
        ai_notes: analysis.autoNotes,
        transcription_status: "completed",
        processed_at: new Date().toISOString(),
        duration_seconds: body.durationSeconds || null,
      })
      .eq("id", recordingId)
  } else {
    // Create new row
    const { data: newRec } = await admin
      .from("call_recordings")
      .insert({
        lead_id: body.leadId || null,
        duration_seconds: body.durationSeconds || null,
        raw_transcript: body.transcript,
        ai_summary: analysis.summary,
        ai_disposition: analysis.disposition,
        ai_coaching: analysis.coaching,
        ai_follow_up_recommendation: analysis.followUpRecommendation,
        ai_notes: analysis.autoNotes,
        transcription_status: "completed",
        processed_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    recordingId = newRec?.id
  }

  // ── Auto-schedule follow-up on lead ──────────────────────────────────────
  let leadUpdated = false
  if (body.leadId && analysis.nextCallAt) {
    const { error: updateErr } = await admin
      .from("dialer_leads")
      .update({
        next_call_at: analysis.nextCallAt,
        status: "callback",
        last_outcome: "callback",
      })
      .eq("id", body.leadId)

    leadUpdated = !updateErr
  } else if (body.leadId && analysis.disposition === "do_not_call") {
    await admin
      .from("dialer_leads")
      .update({ status: "completed", not_interested: true })
      .eq("id", body.leadId)
    leadUpdated = true
  } else if (body.leadId && analysis.disposition === "demo_booked") {
    await admin
      .from("dialer_leads")
      .update({ status: "completed", demo_booked: true })
      .eq("id", body.leadId)
    leadUpdated = true
  }

  return NextResponse.json({
    recordingId,
    analysis,
    leadUpdated,
  })
}
