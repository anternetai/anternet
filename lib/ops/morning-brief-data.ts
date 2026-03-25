/**
 * Shared morning brief data generation logic.
 * Used by both /api/ops/morning-brief and /api/ops/post-morning-brief.
 */

import { createClient } from "@supabase/supabase-js"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmsConversation {
  id: string
  lead_id: string | null
  direction: string
  body: string
  created_at: string
}

interface DialerLead {
  id: string
  business_name: string | null
  trade: string | null
  phone_number: string | null
  notes: string | null
  next_call_at: string | null
  state: string | null
}

interface AgencyClient {
  pipeline_stage: string | null
}

interface CallHistory {
  outcome: string
  created_at: string
}

interface AgencyClientOnboarding {
  id: string
  legal_business_name: string | null
  pipeline_stage: string | null
  pipeline_stage_changed_at: string | null
  onboarding_status: string | null
}

export interface SmsConversationSummary {
  lead_id: string | null
  message_count: number
  latest_message: string
  latest_at: string
  needs_followup: boolean
}

export interface MorningBriefData {
  generated_at: string
  report_date: string
  sms: {
    total_overnight: number
    needing_followup: number
    conversations: SmsConversationSummary[]
  }
  callbacks: Array<{
    id: string
    business_name: string | null
    trade: string | null
    phone: string | null
    notes: string | null
    scheduled_for: string | null
    state: string | null
  }>
  pipeline: Record<string, number>
  yesterday_calls: {
    total: number
    dispositions: Record<string, number>
    demo_rate: number
    conversation_rate: number
    contact_rate: number
  }
  stuck_onboarding: Array<{
    id: string
    name: string | null
    stage: string | null
    days_stuck: number
    onboarding_status: string | null
  }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AdminClient = ReturnType<typeof createClient>

export function getAdminClient(): AdminClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Data Fetchers ────────────────────────────────────────────────────────────

async function fetchOvernightSms(admin: AdminClient) {
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from("sms_conversations")
    .select("id, lead_id, direction, body, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[morning-brief] SMS fetch error:", error.message)
    return []
  }
  return (data || []) as SmsConversation[]
}

async function fetchTodayCallbacks(admin: AdminClient) {
  const nowEt = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  )
  const todayStart = new Date(nowEt)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(nowEt)
  todayEnd.setHours(23, 59, 59, 999)

  const { data, error } = await admin
    .from("dialer_leads")
    .select("id, business_name, trade, phone_number, notes, next_call_at, state")
    .eq("status", "callback")
    .gte("next_call_at", todayStart.toISOString())
    .lte("next_call_at", todayEnd.toISOString())
    .order("next_call_at", { ascending: true })

  if (error) {
    console.error("[morning-brief] Callbacks fetch error:", error.message)
    return []
  }
  return (data || []) as DialerLead[]
}

async function fetchPipelineCounts(admin: AdminClient) {
  const { data, error } = await admin
    .from("agency_clients")
    .select("pipeline_stage")
    .is("deleted_at", null)
    .neq("auth_user_id", "bba79829-7852-4f81-aa2e-393650138e7c")

  if (error) {
    console.error("[morning-brief] Pipeline fetch error:", error.message)
    return {}
  }

  const counts: Record<string, number> = {}
  for (const row of (data || []) as AgencyClient[]) {
    const stage = row.pipeline_stage || "unknown"
    counts[stage] = (counts[stage] || 0) + 1
  }
  return counts
}

async function fetchYesterdayCalls(admin: AdminClient) {
  const nowEt = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  )
  const yesterdayEt = new Date(nowEt)
  yesterdayEt.setDate(yesterdayEt.getDate() - 1)
  const dateStr = yesterdayEt.toISOString().split("T")[0]

  const { data, error } = await admin
    .from("dialer_call_history")
    .select("outcome, created_at")
    .gte("created_at", `${dateStr}T00:00:00.000Z`)
    .lte("created_at", `${dateStr}T23:59:59.999Z`)

  if (error) {
    console.error("[morning-brief] Yesterday calls fetch error:", error.message)
    return { total: 0, dispositions: {} as Record<string, number>, demo_rate: 0, conversation_rate: 0, contact_rate: 0 }
  }

  const calls = (data || []) as CallHistory[]
  const total = calls.length
  const dispositions: Record<string, number> = {}

  for (const call of calls) {
    dispositions[call.outcome] = (dispositions[call.outcome] || 0) + 1
  }

  const demos = dispositions["demo_booked"] || 0
  const conversations =
    (dispositions["conversation"] || 0) +
    demos +
    (dispositions["not_interested"] || 0) +
    (dispositions["wrong_number"] || 0)
  const contacts = conversations + (dispositions["callback"] || 0)

  return {
    total,
    dispositions,
    demo_rate: total > 0 ? Math.round((demos / total) * 1000) / 10 : 0,
    conversation_rate: total > 0 ? Math.round((conversations / total) * 1000) / 10 : 0,
    contact_rate: total > 0 ? Math.round((contacts / total) * 1000) / 10 : 0,
  }
}

async function fetchStuckOnboarding(admin: AdminClient) {
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await admin
    .from("agency_clients")
    .select("id, legal_business_name, pipeline_stage, pipeline_stage_changed_at, onboarding_status")
    .eq("pipeline_stage", "onboarding")
    .lt("pipeline_stage_changed_at", cutoff)
    .is("deleted_at", null)
    .neq("auth_user_id", "bba79829-7852-4f81-aa2e-393650138e7c")

  if (error) {
    console.warn("[morning-brief] Stuck onboarding query failed:", error.message)
    return []
  }

  const results = (data || []) as AgencyClientOnboarding[]
  return results.map((row) => {
    const updatedAt = row.pipeline_stage_changed_at
      ? new Date(row.pipeline_stage_changed_at)
      : new Date(0)
    const daysStuck = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    return {
      id: row.id,
      name: row.legal_business_name,
      stage: row.pipeline_stage,
      days_stuck: daysStuck,
      onboarding_status: row.onboarding_status,
    }
  })
}

export function groupSmsByLead(conversations: SmsConversation[]): SmsConversationSummary[] {
  const grouped = new Map<string, { messages: SmsConversation[]; lead_id: string | null }>()

  for (const msg of conversations) {
    const key = msg.lead_id || msg.id
    if (!grouped.has(key)) {
      grouped.set(key, { messages: [], lead_id: msg.lead_id })
    }
    grouped.get(key)!.messages.push(msg)
  }

  return Array.from(grouped.values()).map(({ messages, lead_id }) => {
    const sorted = messages.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const latest = sorted[0]
    return {
      lead_id,
      message_count: messages.length,
      latest_message: latest.body?.slice(0, 200) || "",
      latest_at: latest.created_at,
      needs_followup: latest.direction === "inbound",
    }
  })
}

// ─── Main Generator ──────────────────────────────────────────────────────────

export async function generateMorningBrief(): Promise<MorningBriefData> {
  const admin = getAdminClient()

  const [smsMessages, callbacks, pipeline, yesterdayCalls, stuckOnboarding] = await Promise.all([
    fetchOvernightSms(admin),
    fetchTodayCallbacks(admin),
    fetchPipelineCounts(admin),
    fetchYesterdayCalls(admin),
    fetchStuckOnboarding(admin),
  ])

  const smsGrouped = groupSmsByLead(smsMessages)
  const needingFollowup = smsGrouped.filter((c) => c.needs_followup).length

  const nowEt = new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  const reportDate = new Date(nowEt).toISOString().split("T")[0]

  return {
    generated_at: new Date().toISOString(),
    report_date: reportDate,
    sms: {
      total_overnight: smsMessages.length,
      needing_followup: needingFollowup,
      conversations: smsGrouped,
    },
    callbacks: callbacks.map((cb) => ({
      id: cb.id,
      business_name: cb.business_name,
      trade: cb.trade,
      phone: cb.phone_number,
      notes: cb.notes,
      scheduled_for: cb.next_call_at,
      state: cb.state,
    })),
    pipeline,
    yesterday_calls: yesterdayCalls,
    stuck_onboarding: stuckOnboarding,
  }
}
