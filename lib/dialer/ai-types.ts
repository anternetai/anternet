/**
 * AI Call Intelligence Types
 * Shared between frontend UI and backend API routes.
 * Created by frontend sub-agent as placeholder (backend agent may enhance).
 */

import type { DialerOutcome } from "./types"

// ─── AI Summarization Response ───────────────────────────────────────────────

export interface AISummarizeRequest {
  transcript: string
  businessName?: string
  leadContext?: string
  leadId?: string
  phoneNumber?: string
  durationSeconds?: number
}

export interface AISummarizeResponse {
  summary: string | null
  disposition: DialerOutcome | null
  notes: string | null
  keyPoints: string[]
  objections: string[]
  nextSteps: string[]
  followUpDate?: string | null
  coachingTips?: CoachingTip[]
  grades?: CallGrades
  saved: boolean
  hasAI: boolean
}

// ─── Coaching & Grading ───────────────────────────────────────────────────────

export interface CallGrades {
  tonality: number        // 1-10
  pacing: number          // 1-10
  objectionHandling: number // 1-10
  closeAttempt: number    // 1-10
  overall: number         // 1-10
}

export interface CoachingTip {
  category: "tonality" | "pacing" | "objection" | "close" | "general"
  tip: string
  severity: "info" | "warning" | "critical"
  timestamp?: number // seconds into call where tip applies
}

// ─── Call Transcript ─────────────────────────────────────────────────────────

export interface TranscriptSegment {
  speaker: "agent" | "prospect" | "unknown"
  text: string
  startTime: number   // seconds
  endTime: number     // seconds
  confidence?: number // 0-1
  highlight?: "objection" | "pitch" | "close" | "rapport" | null
}

export interface CallTranscriptFull {
  id: string
  leadId?: string
  callLogId?: string
  phoneNumber?: string
  durationSeconds?: number
  segments: TranscriptSegment[]
  rawTranscript?: string
  summary?: string
  aiDisposition?: DialerOutcome
  aiNotes?: string
  grades?: CallGrades
  coachingTips?: CoachingTip[]
  createdAt: string
}

// ─── Recording State ─────────────────────────────────────────────────────────

export type RecordingState = "idle" | "recording" | "stopped" | "uploading" | "done" | "error"

export interface RecordingSession {
  state: RecordingState
  startTime?: number    // Date.now() when recording started
  durationMs?: number   // how long the recording lasted
  blob?: Blob           // the recorded audio
  transcript?: string   // STT result
  error?: string
}

// ─── AI Panel State ──────────────────────────────────────────────────────────

export type AIPanelState = "hidden" | "loading" | "ready" | "accepted" | "overridden"

export interface AIAnalysisResult {
  panelState: AIPanelState
  suggestedDisposition?: DialerOutcome
  suggestedNotes?: string
  suggestedFollowUpDate?: string
  summary?: string
  keyPoints?: string[]
  objections?: string[]
  nextSteps?: string[]
  grades?: CallGrades
  coachingTips?: CoachingTip[]
  transcript?: TranscriptSegment[]
  rawTranscript?: string
}

// ─── Follow-Up ───────────────────────────────────────────────────────────────

export interface FollowUpItem {
  leadId: string
  businessName: string
  ownerName?: string
  phoneNumber: string
  lastOutcome: DialerOutcome
  nextCallAt: string
  aiReason?: string
  attemptCount: number
  state?: string
}

export type FollowUpGroup = "today" | "tomorrow" | "this_week" | "next_week" | "later"

export interface FollowUpsByGroup {
  today: FollowUpItem[]
  tomorrow: FollowUpItem[]
  this_week: FollowUpItem[]
  next_week: FollowUpItem[]
  later: FollowUpItem[]
}

// ─── Call Recording (DB row) ──────────────────────────────────────────────────

export type TranscriptionStatus = "pending" | "processing" | "completed" | "failed"

/** Maps to the `call_recordings` database table */
export interface CallRecording {
  id: string
  created_at: string
  lead_id: string | null
  call_history_id: string | null
  duration_seconds: number | null
  recording_url: string | null
  storage_path: string | null
  transcription_status: TranscriptionStatus
  raw_transcript: string | null
  transcript_segments: TranscriptSegment[] | null
  ai_summary: string | null
  ai_disposition: AIDisposition | null
  ai_coaching: CoachingReport | null
  ai_follow_up_recommendation: FollowUpRecommendation | null
  ai_notes: string | null
  processed_at: string | null
}

// ─── AI Disposition (extended) ────────────────────────────────────────────────

/**
 * Extended disposition set used by AI analysis.
 * Superset of DialerOutcome — adds granular spoke_owner states.
 */
export type AIDisposition =
  | "no_answer"
  | "voicemail"
  | "gatekeeper"
  | "owner_no_pitch"
  | "owner_pitched"
  | "demo_booked"
  | "not_interested"
  | "follow_up"
  | "do_not_call"
  | "wrong_number"

// ─── Follow-Up Recommendation ─────────────────────────────────────────────────

export type FollowUpRecommendation = "2_days" | "1_week" | "1_month" | "do_not_call" | "none"

/** Maps FollowUpRecommendation to a concrete number of days */
export const FOLLOW_UP_DAYS: Record<FollowUpRecommendation, number | null> = {
  "2_days": 2,
  "1_week": 7,
  "1_month": 30,
  "do_not_call": null,
  "none": null,
}

// ─── AI Analysis (full result from analyze endpoint) ─────────────────────────

export interface AIAnalysis {
  disposition: AIDisposition
  dispositionConfidence: number        // 0-1
  dispositionReason: string

  followUpRecommendation: FollowUpRecommendation
  followUpReason: string

  summary: string
  keyPoints: string[]
  objections: string[]
  nextSteps: string[]
  autoNotes: string

  coaching: CoachingReport

  /** ISO string of recommended next call date, null if no follow-up needed */
  nextCallAt: string | null
}

// ─── Coaching Report ──────────────────────────────────────────────────────────

export interface CoachingReport {
  /** Overall call grade A-F */
  grade: "A" | "B" | "C" | "D" | "F"

  grades: CallGrades

  tips: CoachingTip[]

  /**
   * Script comparison — which parts of the Face-Melter script were covered.
   * Keys are script sections; value is whether the agent covered that section.
   */
  scriptCoverage: ScriptCoverage

  strengths: string[]
  improvements: string[]

  /** Short 1-liner verdict the rep sees immediately */
  headline: string
}

export interface ScriptCoverage {
  intro: boolean
  patternInterrupt1: boolean
  patternInterrupt2: boolean
  mainPitch: boolean
  downsellClose: boolean
  objectionHandling: boolean
  discoveryQuestions: boolean
  meetingBooked: boolean
}

// ─── Transcription Request/Response ──────────────────────────────────────────

export interface TranscribeRequest {
  /** Base64-encoded audio or a URL to a recording */
  audioBase64?: string
  recordingUrl?: string
  /** Linked lead ID */
  leadId?: string
  callHistoryId?: string
  durationSeconds?: number
}

export interface TranscribeResponse {
  recordingId: string
  transcriptionStatus: TranscriptionStatus
  rawTranscript: string | null
  durationSeconds: number | null
  analysis: AIAnalysis | null
  error?: string
}

// ─── Analyze Request/Response ─────────────────────────────────────────────────

export interface AnalyzeRequest {
  transcript: string
  recordingId?: string
  leadId?: string
  businessName?: string
  ownerName?: string
  state?: string
  leadContext?: string
  durationSeconds?: number
}

export interface AnalyzeResponse {
  recordingId?: string
  analysis: AIAnalysis
  /** Whether lead record was auto-updated with follow-up date */
  leadUpdated: boolean
}

// ─── Coaching Endpoint Response ───────────────────────────────────────────────

export interface CoachingResponse {
  recordingId: string
  coaching: CoachingReport
  rawTranscript: string | null
  leadContext?: {
    businessName: string | null
    ownerName: string | null
    state: string | null
    attemptCount: number
  }
}
