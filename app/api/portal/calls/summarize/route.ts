import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { AISummaryResponse, DialerOutcome } from "@/lib/dialer/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SYSTEM_PROMPT = `You are an AI assistant analyzing cold call transcripts for a B2B sales team selling digital marketing services to home service businesses.

Analyze the transcript and return a JSON object with these fields:
- "disposition": one of: "no_answer", "voicemail", "gatekeeper", "conversation", "demo_booked", "not_interested", "wrong_number", "callback"
- "summary": 1-2 sentence summary of what happened on the call
- "notes": key details worth saving (objections, interests, decision maker info, follow-up items)
- "keyPoints": array of 2-5 bullet points of the most important things said

Rules for disposition:
- "no_answer" — phone rang but nobody picked up, or it went to dead air
- "voicemail" — went to voicemail, or salesperson left a message
- "gatekeeper" — talked to receptionist/gatekeeper, didn't reach decision maker
- "conversation" — spoke with decision maker/owner but no specific outcome yet
- "demo_booked" — successfully scheduled a demo/meeting/appointment
- "not_interested" — decision maker explicitly said no/not interested
- "wrong_number" — wrong number, disconnected, out of service
- "callback" — they asked to be called back at another time

Return ONLY valid JSON. No markdown, no code fences.`

async function callAnthropic(transcript: string): Promise<AISummaryResponse | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Analyze this cold call transcript:\n\n${transcript}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      console.error("Anthropic API error:", res.status, await res.text())
      return null
    }

    const data = await res.json()
    const text = data.content?.[0]?.text
    if (!text) return null

    return JSON.parse(text) as AISummaryResponse
  } catch (e) {
    console.error("Anthropic API error:", e)
    return null
  }
}

async function callOpenAI(transcript: string): Promise<AISummaryResponse | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyze this cold call transcript:\n\n${transcript}`,
          },
        ],
        max_tokens: 1024,
      }),
    })

    if (!res.ok) {
      console.error("OpenAI API error:", res.status, await res.text())
      return null
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) return null

    return JSON.parse(text) as AISummaryResponse
  } catch (e) {
    console.error("OpenAI API error:", e)
    return null
  }
}

// POST /api/portal/calls/summarize — AI-analyze a call transcript
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { transcript, leadId, phoneNumber, durationSeconds } = body as {
    transcript: string
    leadId?: string
    phoneNumber?: string
    durationSeconds?: number
  }

  if (!transcript || transcript.trim().length < 10) {
    return NextResponse.json({
      summary: null,
      disposition: null,
      notes: null,
      keyPoints: [],
      error: "Transcript too short to analyze",
    })
  }

  // Try Anthropic first, fall back to OpenAI
  let aiResult = await callAnthropic(transcript)
  if (!aiResult) {
    aiResult = await callOpenAI(transcript)
  }

  const admin = getAdmin()

  // Save transcript to database
  const { data: savedTranscript } = await admin
    .from("call_transcripts")
    .insert({
      lead_id: leadId || null,
      phone_number: phoneNumber || null,
      duration_seconds: durationSeconds || null,
      raw_transcript: transcript,
      ai_summary: aiResult?.summary || null,
      ai_disposition: aiResult?.disposition || null,
      ai_notes: aiResult?.notes || null,
    })
    .select()
    .single()

  if (!aiResult) {
    // No AI available — return raw transcript saved
    return NextResponse.json({
      transcriptId: savedTranscript?.id,
      summary: null,
      disposition: null,
      notes: null,
      keyPoints: [],
      aiAvailable: false,
      message: "No AI API key configured. Transcript saved without analysis.",
    })
  }

  return NextResponse.json({
    transcriptId: savedTranscript?.id,
    summary: aiResult.summary,
    disposition: aiResult.disposition,
    notes: aiResult.notes,
    keyPoints: aiResult.keyPoints,
    aiAvailable: true,
  })
}
