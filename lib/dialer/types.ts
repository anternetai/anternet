export type DialerTimezone = "ET" | "CT" | "MT" | "PT"

export type DialerStatus = "queued" | "in_progress" | "callback" | "completed" | "archived"

export type DialerOutcome =
  | "no_answer"
  | "voicemail"
  | "gatekeeper"
  | "conversation"
  | "demo_booked"
  | "not_interested"
  | "wrong_number"
  | "callback"

export interface DialerLead {
  id: string
  created_at: string
  updated_at: string
  state: string | null
  business_name: string | null
  phone_number: string | null
  owner_name: string | null
  first_name: string | null
  website: string | null
  timezone: DialerTimezone | null
  status: DialerStatus
  attempt_count: number
  max_attempts: number
  last_called_at: string | null
  next_call_at: string | null
  last_outcome: DialerOutcome | null
  demo_booked: boolean
  demo_date: string | null
  not_interested: boolean
  wrong_number: boolean
  notes: string | null
  import_batch: string | null
  sheet_row_id: string | null
}

export interface DialerCallHistory {
  id: string
  created_at: string
  lead_id: string
  attempt_number: number
  outcome: DialerOutcome
  notes: string | null
  demo_date: string | null
  callback_at: string | null
  call_date: string
  call_time: string
}

export interface DialerQueueResponse {
  leads: DialerLead[]
  totalToday: number
  completedToday: number
  currentTimezone: DialerTimezone | null
  currentHourBlock: string | null
  callbacksDue: DialerLead[]
  breakdownByTimezone: Record<DialerTimezone, number>
  breakdownByState?: Record<string, number>
  selectedNumber: SelectedNumber | null
  phonePoolHealth?: {
    active: number
    cooling: number
    retired: number
    warnings: string[]
  }
}

export interface SelectedNumber {
  id: string
  phone_number: string
  friendly_name: string | null
  area_code: string | null
  calls_this_hour: number
  max_calls_per_hour: number
}

export interface PhonePoolNumber {
  id: string
  created_at: string
  phone_number: string
  friendly_name: string | null
  area_code: string | null
  state: string | null
  twilio_sid: string | null
  status: "active" | "cooling" | "retired"
  calls_today: number
  calls_this_hour: number
  last_used_at: string | null
  total_calls: number
  spam_reports: number
  max_calls_per_hour: number
  cooldown_minutes: number
}

export interface ImportResult {
  imported: number
  duplicates: number
  updated: number
  errors: string[]
}

export interface DailyDialerStats {
  totalLeads: number
  completedToday: number
  callbacksDueToday: number
  breakdownByTimezone: Record<DialerTimezone, number>
  breakdownByHour: { hour: string; timezone: DialerTimezone; count: number }[]
  todayOutcomes: Record<string, number>
}

// State → Timezone mapping
export const STATE_TIMEZONE_MAP: Record<string, DialerTimezone> = {
  // Eastern Time
  NC: "ET", FL: "ET", GA: "ET", SC: "ET", VA: "ET", NY: "ET", PA: "ET",
  OH: "ET", MI: "ET", IN: "ET", KY: "ET", TN: "ET", AL: "ET", MS: "ET",
  CT: "ET", DE: "ET", ME: "ET", MD: "ET", MA: "ET", NH: "ET", NJ: "ET",
  RI: "ET", VT: "ET", WV: "ET", DC: "ET",
  // Central Time
  TX: "CT", IL: "CT", WI: "CT", MN: "CT", IA: "CT", MO: "CT", AR: "CT",
  LA: "CT", KS: "CT", NE: "CT", ND: "CT", SD: "CT", OK: "CT",
  // Mountain Time
  AZ: "MT", CO: "MT", ID: "MT", MT: "MT", NM: "MT", UT: "MT", WY: "MT",
  // Pacific Time
  CA: "PT", NV: "PT", OR: "PT", WA: "PT",
  // Territories / others → default ET
  HI: "PT", AK: "PT", PR: "ET", VI: "ET", GU: "PT",
}

// Timezone cascade schedule: 1-hour blocks starting at :30
// Strategy: hit each timezone at 7:30 AM local time (THE MOVE — early morning blitz)
// Each block runs from :30 to :30 (e.g., 7:30-8:30 ET = Eastern)
// Lunch window at noon, EOD follow-ups at 4 PM ET. Gaps = PW job hours (manual TZ select).

export const TIMEZONE_SCHEDULE: { etHour: number; timezone: DialerTimezone; label: string }[] = [
  { etHour: 7, timezone: "ET", label: "7:30-8:30 AM ET → Eastern leads" },
  { etHour: 8, timezone: "CT", label: "8:30-9:30 AM ET → Central leads" },
  { etHour: 9, timezone: "MT", label: "9:30-10:30 AM ET → Mountain leads" },
  { etHour: 10, timezone: "PT", label: "10:30-11:30 AM ET → Pacific leads" },
  { etHour: 12, timezone: "ET", label: "12-12:30 PM ET → Eastern/Central lunch window" },
  { etHour: 16, timezone: "ET", label: "4-5 PM ET → Eastern EOD (Tue-Fri)" },
]

export function getCurrentETHour(): number {
  const now = new Date()
  // Convert to ET (America/New_York)
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  return etTime.getHours()
}

export function getCurrentETMinutes(): number {
  const now = new Date()
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  return etTime.getMinutes()
}

export function isFriday(): boolean {
  const now = new Date()
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  return etTime.getDay() === 5
}

export function getActiveSchedule() {
  return TIMEZONE_SCHEDULE
}

// Get the effective schedule slot for the current time.
// Blocks run :30 to :30, so at 8:03 ET (minutes < 30) we're still in the
// 7:30-8:30 block (etHour 7 = ET), not the 8:30-9:30 block (etHour 8 = CT).
// Exception: lunch (12) and EOD (16) blocks start on the hour.
export function getTimezoneForHour(etHour: number): DialerTimezone | null {
  const minutes = getCurrentETMinutes()
  const schedule = getActiveSchedule()

  // For the morning cascade (hours 7-11), blocks start at :30
  // Before :30, you're still in the previous hour's block
  let lookupHour = etHour
  if (etHour >= 7 && etHour <= 11 && minutes < 30) {
    lookupHour = etHour - 1
  }

  const entry = schedule.find((s) => s.etHour === lookupHour)
  return entry?.timezone ?? null
}

export function getScheduleForHour(etHour: number) {
  const minutes = getCurrentETMinutes()
  const schedule = getActiveSchedule()

  let lookupHour = etHour
  if (etHour >= 7 && etHour <= 11 && minutes < 30) {
    lookupHour = etHour - 1
  }

  return schedule.find((s) => s.etHour === lookupHour) ?? null
}

// Call transcript types
export interface CallTranscript {
  id: string
  created_at: string
  lead_id: string | null
  call_log_id: string | null
  phone_number: string | null
  duration_seconds: number | null
  raw_transcript: string | null
  ai_summary: string | null
  ai_disposition: DialerOutcome | null
  ai_notes: string | null
}

export interface AISummaryResponse {
  summary: string
  disposition: DialerOutcome
  notes: string
  keyPoints: string[]
}

// Call state for in-browser dialer
export type CallState = "idle" | "connecting" | "ringing" | "connected" | "disconnected"
