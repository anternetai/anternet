/**
 * POST /api/portal/calls/transcribe
 *
 * Accepts an audio file upload (multipart) or a recording_url string.
 * Sends audio to OpenAI Whisper for transcription.
 * Stores the result in `call_recordings` and triggers AI analysis.
 *
 * Body (multipart/form-data):
 *   - audio: File  (optional if recording_url provided)
 *   - recording_url: string (optional if audio file provided)
 *   - lead_id: string (optional)
 *   - call_history_id: string (optional)
 *   - duration_seconds: number (optional)
 *
 * OR Body (application/json):
 *   { recording_url, lead_id, call_history_id, duration_seconds }
 */

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type {
  TranscribeResponse,
  AIAnalysis,
  TranscriptionStatus,
} from "@/lib/dialer/ai-types"
import { runAIAnalysis } from "@/lib/dialer/ai-analysis"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Whisper transcription ────────────────────────────────────────────────────

async function transcribeWithWhisper(
  audioBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<{ text: string; duration?: number } | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("[transcribe] No OPENAI_API_KEY configured")
    return null
  }

  try {
    const formData = new FormData()
    const blob = new Blob([audioBuffer.buffer as ArrayBuffer], { type: mimeType })
    formData.append("file", blob, filename)
    formData.append("model", "whisper-1")
    formData.append("response_format", "verbose_json")
    formData.append("language", "en")

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("[transcribe] Whisper error:", res.status, err)
      return null
    }

    const data = await res.json()
    return {
      text: data.text || "",
      duration: data.duration ? Math.round(data.duration) : undefined,
    }
  } catch (e) {
    console.error("[transcribe] Whisper exception:", e)
    return null
  }
}

// ─── Fetch audio from URL ─────────────────────────────────────────────────────

async function fetchAudioFromUrl(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error("[transcribe] Failed to fetch recording URL:", res.status)
      return null
    }
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (e) {
    console.error("[transcribe] Fetch audio error:", e)
    return null
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<TranscribeResponse | { error: string }>> {
  // Auth check
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const contentType = req.headers.get("content-type") || ""

  let audioBuffer: Buffer | null = null
  let mimeType = "audio/webm"
  let filename = "recording.webm"
  let recordingUrl: string | null = null
  let leadId: string | null = null
  let callHistoryId: string | null = null
  let durationSeconds: number | null = null
  let userDisposition: string | null = null

  // ── Parse input ──────────────────────────────────────────────────────────
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as File | null
    recordingUrl = (formData.get("recording_url") as string) || null
    leadId = (formData.get("lead_id") as string) || null
    callHistoryId = (formData.get("call_history_id") as string) || null
    const durStr = formData.get("duration_seconds") as string | null
    durationSeconds = durStr ? parseInt(durStr) : null
    userDisposition = (formData.get("user_disposition") as string) || null

    if (audioFile) {
      const arrayBuffer = await audioFile.arrayBuffer()
      audioBuffer = Buffer.from(arrayBuffer)
      mimeType = audioFile.type || "audio/webm"
      filename = audioFile.name || "recording.webm"
    }
  } else {
    const body = await req.json()
    recordingUrl = body.recording_url || null
    leadId = body.lead_id || null
    callHistoryId = body.call_history_id || null
    durationSeconds = body.duration_seconds || null
    userDisposition = body.user_disposition || null
  }

  // ── Fetch audio from URL if not uploaded directly ────────────────────────
  if (!audioBuffer && recordingUrl) {
    audioBuffer = await fetchAudioFromUrl(recordingUrl)
    // Guess MIME type from URL
    if (recordingUrl.endsWith(".mp3")) mimeType = "audio/mpeg"
    else if (recordingUrl.endsWith(".wav")) mimeType = "audio/wav"
    else if (recordingUrl.endsWith(".ogg")) mimeType = "audio/ogg"
    filename = recordingUrl.split("/").pop() || "recording"
  }

  if (!audioBuffer && !recordingUrl) {
    return NextResponse.json({ error: "audio file or recording_url is required" }, { status: 400 })
  }

  // ── Create initial DB record (status = processing) ────────────────────────
  const { data: recording, error: insertErr } = await admin
    .from("call_recordings")
    .insert({
      lead_id: leadId,
      call_history_id: callHistoryId,
      duration_seconds: durationSeconds,
      recording_url: recordingUrl,
      transcription_status: "processing" as TranscriptionStatus,
    })
    .select()
    .single()

  if (insertErr || !recording) {
    console.error("[transcribe] Failed to create recording row:", insertErr)
    return NextResponse.json({ error: "Failed to create recording record" }, { status: 500 })
  }

  const recordingId = recording.id

  // ── Transcribe with Whisper ───────────────────────────────────────────────
  let transcript: string | null = null
  let whisperDuration: number | null = null

  if (audioBuffer) {
    const result = await transcribeWithWhisper(audioBuffer, mimeType, filename)
    if (result) {
      transcript = result.text
      whisperDuration = result.duration || null
      if (!durationSeconds && whisperDuration) durationSeconds = whisperDuration
    }
  }

  if (!transcript) {
    // Mark as failed
    await admin
      .from("call_recordings")
      .update({ transcription_status: "failed" as TranscriptionStatus })
      .eq("id", recordingId)

    return NextResponse.json({
      recordingId,
      transcriptionStatus: "failed",
      rawTranscript: null,
      durationSeconds,
      analysis: null,
      error: "Transcription failed — check OPENAI_API_KEY",
    })
  }

  // ── Get lead context for AI analysis ─────────────────────────────────────
  let leadContext: Record<string, unknown> = {}
  if (leadId) {
    const { data: lead } = await admin
      .from("dialer_leads")
      .select("business_name, owner_name, state, attempt_count, notes")
      .eq("id", leadId)
      .single()
    if (lead) leadContext = lead
  }

  // ── Run AI analysis ───────────────────────────────────────────────────────
  let analysis: AIAnalysis | null = null
  try {
    analysis = await runAIAnalysis({
      transcript,
      leadId: leadId || undefined,
      businessName: (leadContext.business_name as string) || undefined,
      ownerName: (leadContext.owner_name as string) || undefined,
      state: (leadContext.state as string) || undefined,
      durationSeconds: durationSeconds || undefined,
      userDisposition: userDisposition || undefined,
    })
  } catch (e) {
    console.error("[transcribe] AI analysis error:", e)
  }

  // ── Update DB record with results ─────────────────────────────────────────
  const updatePayload: Record<string, unknown> = {
    transcription_status: "completed" as TranscriptionStatus,
    raw_transcript: transcript,
    duration_seconds: durationSeconds,
    processed_at: new Date().toISOString(),
  }

  if (analysis) {
    updatePayload.ai_summary = analysis.summary
    updatePayload.ai_disposition = analysis.disposition
    updatePayload.ai_coaching = analysis.coaching
    updatePayload.ai_follow_up_recommendation = analysis.followUpRecommendation
    updatePayload.ai_notes = analysis.autoNotes
  }

  await admin.from("call_recordings").update(updatePayload).eq("id", recordingId)

  // ── Auto-update lead with follow-up scheduling ────────────────────────────
  if (analysis && leadId && analysis.nextCallAt) {
    await admin
      .from("dialer_leads")
      .update({
        next_call_at: analysis.nextCallAt,
        status: "callback",
        last_outcome: "callback",
      })
      .eq("id", leadId)
  }

  return NextResponse.json({
    recordingId,
    transcriptionStatus: "completed",
    rawTranscript: transcript,
    durationSeconds,
    analysis,
  })
}
