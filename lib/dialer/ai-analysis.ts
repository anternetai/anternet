/**
 * AI Analysis Core — HomeField Hub
 *
 * Shared logic for running GPT-based analysis on cold call transcripts.
 * Used by:
 *   - /api/portal/calls/transcribe
 *   - /api/portal/calls/analyze
 *   - /api/portal/calls/coaching
 *
 * Based on the HomeField Hub "Face-Melter" cold call script.
 */

import type {
  AIAnalysis,
  AIDisposition,
  CoachingReport,
  CoachingTip,
  CallGrades,
  ScriptCoverage,
  FollowUpRecommendation,
} from "./ai-types"
import { FOLLOW_UP_DAYS } from "./ai-types"

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert cold call analyst and sales coach for HomeField Hub, a B2B marketing agency for roofing contractors.

HomeField Hub's unique offer:
- Runs exclusive Facebook ads for roofing contractors (not shared leads)
- AI follow-up system contacts leads in under 60 seconds and books appointments
- Performance-based: $200 per booked appointment, no retainer
- $5K setup fee waived until $50K revenue milestone
- Target metric: 10x ROI ($360 in → $3,600 out)

The "Face-Melter" cold call script has these key sections:
1. INTRO — "Hey [Name]... this is Anthony at HomeField Hub. Do you mind if I grab just a quick half a minute?"
2. PATTERN INTERRUPT 1 — "Have you heard of HomeField Hub by any chance?"
3. PATTERN INTERRUPT 2 — "Are you focused on residential or commercial right now?"
4. MAIN PITCH — Shared lead platforms are broken (Angi/HomeAdvisor race to bottom), we run exclusive ads + speed-to-lead AI, $200/booked appointment model
5. DOWNSELL / CLOSE — "You game to loop up for a quick peek?"
6. OBJECTION HANDLING — Handle "I'm busy", "send email", "not interested" etc.
7. DISCOVERY QUESTIONS — How's business? Lead sources? Goal volume?
8. MEETING BOOKED — Confirm time, email, calendar invite

Dispositions:
- no_answer: Rang, nobody picked up / dead air
- voicemail: Went to VM or left a message
- gatekeeper: Spoke with non-owner (receptionist, employee)
- owner_no_pitch: Reached owner but hung up before pitch
- owner_pitched: Pitched the owner but no commitment
- demo_booked: Owner agreed to a meeting/demo
- not_interested: Owner explicitly said no
- follow_up: Owner interested but needs time — AI determines timing
- do_not_call: Asked to be removed / aggressive refusal
- wrong_number: Disconnected, wrong number, out of service

Follow-up timing recommendations:
- 2_days: Light interest / wanted more time / "call me later this week"
- 1_week: Mild interest / "I'm busy right now" / "try me next week"
- 1_month: Seasonal / "call me in spring" / wrapping up jobs
- do_not_call: Hostile, DNC request
- none: No follow-up needed (call completed, demo booked, wrong number)

Coaching grades (1-10 scale):
- tonality: Confidence, downswings, pacing (not desperate, not monotone)
- pacing: Appropriate pauses, not rushing, conversational rhythm
- objectionHandling: Handled objections gracefully (not defensive, not giving up)
- closeAttempt: Clear ask for the meeting, specific time/day

You must respond with ONLY valid JSON. No markdown. No code fences. No explanatory text.`

const buildUserPrompt = (opts: {
  transcript: string
  businessName?: string
  ownerName?: string
  state?: string
  leadContext?: string
  durationSeconds?: number
}): string => {
  const parts: string[] = []

  parts.push(`CALL TRANSCRIPT:\n${opts.transcript}`)

  if (opts.businessName || opts.ownerName || opts.state) {
    parts.push(`\nLEAD CONTEXT:`)
    if (opts.businessName) parts.push(`  Business: ${opts.businessName}`)
    if (opts.ownerName) parts.push(`  Owner: ${opts.ownerName}`)
    if (opts.state) parts.push(`  State: ${opts.state}`)
  }

  if (opts.leadContext) {
    parts.push(`\nADDITIONAL CONTEXT:\n${opts.leadContext}`)
  }

  if (opts.durationSeconds) {
    const mins = Math.floor(opts.durationSeconds / 60)
    const secs = opts.durationSeconds % 60
    parts.push(`\nCall duration: ${mins}m ${secs}s`)
  }

  parts.push(`
Return a JSON object with this exact structure:
{
  "disposition": "<one of the disposition keys>",
  "dispositionConfidence": <0.0-1.0>,
  "dispositionReason": "<1 sentence why>",
  "followUpRecommendation": "<2_days|1_week|1_month|do_not_call|none>",
  "followUpReason": "<1 sentence why>",
  "summary": "<2-3 sentence summary of the call>",
  "keyPoints": ["<point1>", "<point2>", ...],
  "objections": ["<objection1>", ...],
  "nextSteps": ["<step1>", ...],
  "autoNotes": "<CRM-ready notes for this lead — include any names, companies, interests, objections, and timing>",
  "coaching": {
    "grade": "<A|B|C|D|F>",
    "grades": {
      "tonality": <1-10>,
      "pacing": <1-10>,
      "objectionHandling": <1-10>,
      "closeAttempt": <1-10>,
      "overall": <1-10>
    },
    "scriptCoverage": {
      "intro": <true|false>,
      "patternInterrupt1": <true|false>,
      "patternInterrupt2": <true|false>,
      "mainPitch": <true|false>,
      "downsellClose": <true|false>,
      "objectionHandling": <true|false>,
      "discoveryQuestions": <true|false>,
      "meetingBooked": <true|false>
    },
    "tips": [
      {
        "category": "<tonality|pacing|objection|close|general>",
        "tip": "<specific, actionable coaching tip>",
        "severity": "<info|warning|critical>"
      }
    ],
    "strengths": ["<strength1>", ...],
    "improvements": ["<improvement1>", ...],
    "headline": "<one punchy 1-line verdict>"
  }
}`)

  return parts.join("\n")
}

// ─── GPT Call ─────────────────────────────────────────────────────────────────

interface RawAIResponse {
  disposition: AIDisposition
  dispositionConfidence: number
  dispositionReason: string
  followUpRecommendation: FollowUpRecommendation
  followUpReason: string
  summary: string
  keyPoints: string[]
  objections: string[]
  nextSteps: string[]
  autoNotes: string
  coaching: {
    grade: string
    grades: CallGrades
    scriptCoverage: ScriptCoverage
    tips: CoachingTip[]
    strengths: string[]
    improvements: string[]
    headline: string
  }
}

async function callOpenAI(userPrompt: string): Promise<RawAIResponse | null> {
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
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      console.error("[ai-analysis] OpenAI error:", res.status, await res.text())
      return null
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) return null
    return JSON.parse(text) as RawAIResponse
  } catch (e) {
    console.error("[ai-analysis] OpenAI exception:", e)
    return null
  }
}

async function callAnthropic(userPrompt: string): Promise<RawAIResponse | null> {
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
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    })

    if (!res.ok) {
      console.error("[ai-analysis] Anthropic error:", res.status, await res.text())
      return null
    }

    const data = await res.json()
    const text = data.content?.[0]?.text
    if (!text) return null
    return JSON.parse(text) as RawAIResponse
  } catch (e) {
    console.error("[ai-analysis] Anthropic exception:", e)
    return null
  }
}

// ─── Fallback analysis (no AI available) ─────────────────────────────────────

function buildFallbackAnalysis(transcript: string): AIAnalysis {
  // Simple keyword-based disposition without AI
  const lower = transcript.toLowerCase()
  let disposition: AIDisposition = "owner_pitched"
  let followUpRecommendation: FollowUpRecommendation = "1_week"

  if (!transcript || transcript.length < 20) {
    disposition = "no_answer"
    followUpRecommendation = "2_days"
  } else if (lower.includes("voicemail") || lower.includes("leave a message") || lower.includes("after the beep")) {
    disposition = "voicemail"
    followUpRecommendation = "2_days"
  } else if (lower.includes("demo") || lower.includes("appointment") || lower.includes("schedule") || lower.includes("calendar")) {
    disposition = "demo_booked"
    followUpRecommendation = "none"
  } else if (lower.includes("not interested") || lower.includes("don't call") || lower.includes("remove me")) {
    disposition = "not_interested"
    followUpRecommendation = "do_not_call"
  } else if (lower.includes("wrong number") || lower.includes("disconnected")) {
    disposition = "wrong_number"
    followUpRecommendation = "none"
  }

  const days = FOLLOW_UP_DAYS[followUpRecommendation]
  const nextCallAt = days ? (() => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(9, 0, 0, 0)
    return d.toISOString()
  })() : null

  const defaultCoaching: CoachingReport = {
    grade: "C",
    grades: {
      tonality: 5,
      pacing: 5,
      objectionHandling: 5,
      closeAttempt: 5,
      overall: 5,
    },
    scriptCoverage: {
      intro: false,
      patternInterrupt1: false,
      patternInterrupt2: false,
      mainPitch: false,
      downsellClose: false,
      objectionHandling: false,
      discoveryQuestions: false,
      meetingBooked: false,
    },
    tips: [{
      category: "general",
      tip: "AI coaching unavailable — configure OPENAI_API_KEY or ANTHROPIC_API_KEY for detailed analysis",
      severity: "info",
    }],
    strengths: [],
    improvements: ["Configure AI for detailed coaching"],
    headline: "No AI available — basic keyword analysis only",
  }

  return {
    disposition,
    dispositionConfidence: 0.5,
    dispositionReason: "Keyword-based fallback analysis (no AI configured)",
    followUpRecommendation,
    followUpReason: "Default follow-up timing based on disposition",
    summary: "Call recorded and transcribed. AI analysis requires API key configuration.",
    keyPoints: [],
    objections: [],
    nextSteps: [],
    autoNotes: `Call transcribed. Disposition: ${disposition}. Manual review recommended.`,
    coaching: defaultCoaching,
    nextCallAt,
  }
}

// ─── Schedule next call date ──────────────────────────────────────────────────

function computeNextCallAt(recommendation: FollowUpRecommendation): string | null {
  const days = FOLLOW_UP_DAYS[recommendation]
  if (!days) return null

  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function runAIAnalysis(opts: {
  transcript: string
  leadId?: string
  businessName?: string
  ownerName?: string
  state?: string
  leadContext?: string
  durationSeconds?: number
}): Promise<AIAnalysis> {
  const userPrompt = buildUserPrompt(opts)

  // Try OpenAI first (more reliable JSON mode), then Anthropic
  let raw = await callOpenAI(userPrompt)
  if (!raw) {
    raw = await callAnthropic(userPrompt)
  }

  // Fallback if no AI
  if (!raw) {
    return buildFallbackAnalysis(opts.transcript)
  }

  // Validate and normalize
  const disposition: AIDisposition = raw.disposition || "conversation"
  const followUpRecommendation: FollowUpRecommendation = raw.followUpRecommendation || "none"
  const nextCallAt = computeNextCallAt(followUpRecommendation)

  // Normalize grade letter
  const gradeMap: Record<string, CoachingReport["grade"]> = {
    A: "A", B: "B", C: "C", D: "D", F: "F",
  }

  const coaching: CoachingReport = {
    grade: gradeMap[raw.coaching?.grade] || "C",
    grades: {
      tonality: Math.min(10, Math.max(1, raw.coaching?.grades?.tonality || 5)),
      pacing: Math.min(10, Math.max(1, raw.coaching?.grades?.pacing || 5)),
      objectionHandling: Math.min(10, Math.max(1, raw.coaching?.grades?.objectionHandling || 5)),
      closeAttempt: Math.min(10, Math.max(1, raw.coaching?.grades?.closeAttempt || 5)),
      overall: Math.min(10, Math.max(1, raw.coaching?.grades?.overall || 5)),
    },
    scriptCoverage: raw.coaching?.scriptCoverage || {
      intro: false,
      patternInterrupt1: false,
      patternInterrupt2: false,
      mainPitch: false,
      downsellClose: false,
      objectionHandling: false,
      discoveryQuestions: false,
      meetingBooked: false,
    },
    tips: (raw.coaching?.tips || []).map((t) => ({
      category: (["tonality", "pacing", "objection", "close", "general"].includes(t.category)
        ? t.category
        : "general") as CoachingTip["category"],
      tip: t.tip || "",
      severity: (["info", "warning", "critical"].includes(t.severity)
        ? t.severity
        : "info") as CoachingTip["severity"],
      timestamp: t.timestamp,
    })),
    strengths: raw.coaching?.strengths || [],
    improvements: raw.coaching?.improvements || [],
    headline: raw.coaching?.headline || "",
  }

  return {
    disposition,
    dispositionConfidence: Math.min(1, Math.max(0, raw.dispositionConfidence || 0.7)),
    dispositionReason: raw.dispositionReason || "",
    followUpRecommendation,
    followUpReason: raw.followUpReason || "",
    summary: raw.summary || "",
    keyPoints: raw.keyPoints || [],
    objections: raw.objections || [],
    nextSteps: raw.nextSteps || [],
    autoNotes: raw.autoNotes || "",
    coaching,
    nextCallAt,
  }
}
