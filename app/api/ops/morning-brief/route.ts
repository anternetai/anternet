/**
 * POST /api/ops/morning-brief
 * ----------------------------
 * Cron-triggered endpoint that runs the morning brief generator.
 * Called by n8n at ~7:00 AM ET daily.
 *
 * Auth: x-cron-secret header must match CRON_SECRET env var.
 *
 * Returns JSON with status and the generated brief data.
 */

import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SmsConversation {
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

interface SmsConversationSummary {
  lead_id: string | null
  message_count: number
  latest_message: string
  latest_at: string
  needs_followup: boolean
}

interface MorningBriefData {
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

// ─── Data Fetchers ────────────────────────────────────────────────────────────

async function fetchOvernightSms(admin: ReturnType<typeof getAdmin>) {
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from("sms_conversations")
    .select("id, lead_id, direction, body, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[morning-brief/route] SMS fetch error:", error.message)
    return []
  }
  return (data || []) as SmsConversation[]
}

async function fetchTodayCallbacks(admin: ReturnType<typeof getAdmin>) {
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
    console.error("[morning-brief/route] Callbacks fetch error:", error.message)
    return []
  }
  return (data || []) as DialerLead[]
}

async function fetchPipelineCounts(admin: ReturnType<typeof getAdmin>) {
  const { data, error } = await admin
    .from("agency_clients")
    .select("pipeline_stage")
    .is("deleted_at", null)
    .neq("auth_user_id", "bba79829-7852-4f81-aa2e-393650138e7c")

  if (error) {
    console.error("[morning-brief/route] Pipeline fetch error:", error.message)
    return {}
  }

  const counts: Record<string, number> = {}
  for (const row of (data || []) as AgencyClient[]) {
    const stage = row.pipeline_stage || "unknown"
    counts[stage] = (counts[stage] || 0) + 1
  }
  return counts
}

async function fetchYesterdayCalls(admin: ReturnType<typeof getAdmin>) {
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
    console.error("[morning-brief/route] Yesterday calls fetch error:", error.message)
    return { total: 0, dispositions: {}, demo_rate: 0, conversation_rate: 0, contact_rate: 0 }
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

async function fetchStuckOnboarding(admin: ReturnType<typeof getAdmin>) {
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await admin
    .from("agency_clients")
    .select("id, legal_business_name, pipeline_stage, pipeline_stage_changed_at, onboarding_status")
    .eq("pipeline_stage", "onboarding")
    .lt("pipeline_stage_changed_at", cutoff)
    .is("deleted_at", null)
    .neq("auth_user_id", "bba79829-7852-4f81-aa2e-393650138e7c")

  if (error) {
    console.warn("[morning-brief/route] Stuck onboarding query failed:", error.message)
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

function groupSmsByLead(conversations: SmsConversation[]): SmsConversationSummary[] {
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

// ─── Core Logic ───────────────────────────────────────────────────────────────

async function generateMorningBrief(): Promise<MorningBriefData> {
  const admin = getAdmin()

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

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET
  const incomingSecret = req.headers.get("x-cron-secret")

  if (!cronSecret || incomingSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[api/ops/morning-brief] Starting morning brief generation...")
    const data = await generateMorningBrief()

    console.log(`[api/ops/morning-brief] Done. ${data.sms.total_overnight} overnight SMS, ${data.callbacks.length} callbacks, ${data.stuck_onboarding.length} stuck in onboarding.`)

    return NextResponse.json({
      status: "ok",
      generated_at: data.generated_at,
      report_date: data.report_date,
      summary: {
        sms_overnight: data.sms.total_overnight,
        sms_needing_followup: data.sms.needing_followup,
        callbacks_today: data.callbacks.length,
        pipeline_total: Object.values(data.pipeline).reduce((a, b) => a + b, 0),
        yesterday_calls: data.yesterday_calls.total,
        yesterday_demo_rate: data.yesterday_calls.demo_rate,
        stuck_onboarding: data.stuck_onboarding.length,
      },
      data,
    })
  } catch (err) {
    console.error("[api/ops/morning-brief] Error:", err)
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    )
  }
}
