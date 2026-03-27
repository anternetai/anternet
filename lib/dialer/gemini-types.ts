/**
 * Gemini Live Coach — Type Definitions
 * Real-time AI sales coaching via Gemini 3.1 Flash Live API.
 */

// ─── Coaching Messages ──────────────────────────────────────────────────────

export type CoachingUrgency = "critical" | "adjust" | "positive"

export interface CoachingMessage {
  id: string
  text: string
  urgency: CoachingUrgency
  timestamp: number // Date.now()
  latencyMs: number // round-trip from audio chunk → coaching response
}

// ─── Live Coach State ───────────────────────────────────────────────────────

export interface LiveCoachState {
  messages: CoachingMessage[]
  isConnected: boolean
  isEnabled: boolean
  latency: number | null // most recent round-trip ms
  error: string | null
  sessionStartedAt: number | null
}

// ─── Gemini Session Config ──────────────────────────────────────────────────

export interface GeminiSessionConfig {
  model: string
  systemInstruction: string
  audioFormat: {
    sampleRate: number
    channels: number
    encoding: "pcm16"
  }
}

// ─── WebSocket Messages (browser ↔ proxy) ───────────────────────────────────

/** Browser sends audio chunks to the proxy */
export interface WSAudioChunk {
  type: "audio"
  data: string // base64-encoded 16kHz mono PCM
  sentAt: number // Date.now() for latency tracking
}

/** Proxy sends coaching text back to browser */
export interface WSCoachingResponse {
  type: "coaching"
  text: string
  urgency: CoachingUrgency
  sentAt: number // original audio sentAt, for latency calc
}

/** Proxy sends status updates */
export interface WSStatusMessage {
  type: "status"
  status: "connected" | "disconnected" | "error" | "reconnecting"
  message?: string
}

/** Proxy sends session summary on disconnect */
export interface WSSessionSummary {
  type: "summary"
  totalMessages: number
  criticalCount: number
  adjustCount: number
  positiveCount: number
  sessionDurationMs: number
}

export type WSMessageFromProxy = WSCoachingResponse | WSStatusMessage | WSSessionSummary
export type WSMessageFromBrowser = WSAudioChunk | { type: "start"; leadInfo?: LeadContext } | { type: "stop" }

// ─── Lead Context (sent to Gemini for tailored coaching) ────────────────────

export interface LeadContext {
  businessName?: string | null
  ownerName?: string | null
  state?: string | null
  industry?: string | null
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const GEMINI_MODEL = "gemini-3.1-flash-live-preview"

export const GEMINI_AUDIO_CONFIG = {
  sampleRate: 16000,
  channels: 1,
  encoding: "pcm16" as const,
  chunkIntervalMs: 30, // send a chunk every 30ms
}

export const COACHING_SYSTEM_INSTRUCTION = `You are a silent, elite sales coach listening to a live cold call in real time.
The caller sells AI-powered lead generation to home service contractors (roofers, HVAC, plumbers, etc).
Their pricing: $200 per showed appointment, $50/day ad spend, no retainer.

Rules:
- Output ONLY brief, direct coaching text — under 15 words per message
- Only speak when you detect a clear coachable moment — do NOT narrate the call
- Never describe what's happening — only coach
- Prioritize: closing opportunities, tone issues, talking too much, objection handling, appointment setting
- Use these urgency prefixes EXACTLY:
  🔴 = act NOW (closing window, prospect said yes, critical mistake)
  🟡 = adjust (tone, pacing, talking too much, weak pitch)
  🟢 = doing great (landed a good line, handled objection well)

Examples:
🔴 Ask for the appointment. Now.
🔴 They said yes — stop selling and book it.
🟡 You're talking too much. Pause. Let them speak.
🟡 Tone is too aggressive. Soften up.
🟡 Don't pitch yet — ask a question first.
🟢 Great objection handle. Pivot to pricing.
🟢 Good energy. Keep this pace.

If there is nothing to coach on, say NOTHING. Silence is fine.`

/** Parse urgency from Gemini's emoji prefix */
export function parseUrgency(text: string): { urgency: CoachingUrgency; cleanText: string } {
  if (text.startsWith("🔴")) return { urgency: "critical", cleanText: text.replace(/^🔴\s*/, "") }
  if (text.startsWith("🟡")) return { urgency: "adjust", cleanText: text.replace(/^🟡\s*/, "") }
  if (text.startsWith("🟢")) return { urgency: "positive", cleanText: text.replace(/^🟢\s*/, "") }
  // Default to adjust if no prefix
  return { urgency: "adjust", cleanText: text }
}
