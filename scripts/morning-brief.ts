/**
 * Morning Brief Generator
 * -----------------------
 * Generates the morning operations briefing for HomeField Hub.
 *
 * Run with:
 *   npx tsx scripts/morning-brief.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

// ─── Supabase Admin Client ────────────────────────────────────────────────────

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    )
  }
  return createClient(url, key)
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
    console.error("[morning-brief] SMS fetch error:", error.message)
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
    console.error("[morning-brief] Callbacks fetch error:", error.message)
    return []
  }

  return (data || []) as DialerLead[]
}

async function fetchPipelineCounts(admin: ReturnType<typeof getAdmin>) {
  const { data, error } = await admin
    .from("agency_clients")
    .select("pipeline_stage")
    .is("deleted_at", null)
    .neq("auth_user_id", "bba79829-7852-4f81-aa2e-393650138e7c") // exclude admin

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
    console.error("[morning-brief] Yesterday calls fetch error:", error.message)
    return { total: 0, dispositions: {}, demo_rate: 0, conversation_rate: 0, contact_rate: 0 }
  }

  const calls = (data || []) as CallHistory[]
  const total = calls.length
  const dispositions: Record<string, number> = {}

  for (const call of calls) {
    dispositions[call.outcome] = (dispositions[call.outcome] || 0) + 1
  }

  const demos = dispositions["demo_booked"] || 0
  const conversations = (dispositions["conversation"] || 0) + demos +
    (dispositions["not_interested"] || 0) + (dispositions["wrong_number"] || 0)
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
    // pipeline_stage_changed_at column might not exist — gracefully handle
    console.warn("[morning-brief] Stuck onboarding query failed:", error.message)
    return []
  }

  const results = (data || []) as AgencyClientOnboarding[]
  return results.map((row) => {
    const updatedAt = row.pipeline_stage_changed_at ? new Date(row.pipeline_stage_changed_at) : new Date(0)
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

// ─── Report Builder ───────────────────────────────────────────────────────────

function groupSmsByLead(conversations: SmsConversation[]): SmsConversationSummary[] {
  const grouped = new Map<
    string,
    { messages: SmsConversation[]; lead_id: string | null }
  >()

  for (const msg of conversations) {
    const key = msg.lead_id || msg.id // fallback to msg id if no lead
    if (!grouped.has(key)) {
      grouped.set(key, { messages: [], lead_id: msg.lead_id })
    }
    grouped.get(key)!.messages.push(msg)
  }

  return Array.from(grouped.values()).map(({ messages, lead_id }) => {
    const sorted = messages.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    // Flag as needing follow-up if the latest message is inbound (lead reaching out)
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

function buildMarkdownReport(data: MorningBriefData): string {
  const nowEt = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })

  const lines: string[] = []

  lines.push(`# Morning Brief — ${data.report_date}`)
  lines.push(`*Generated ${nowEt} ET*`)
  lines.push("")

  // ── SMS Section ──
  lines.push("## Overnight SMS")
  lines.push(
    `**${data.sms.total_overnight}** messages across ${data.sms.conversations.length} conversations — **${data.sms.needing_followup}** need follow-up`
  )
  lines.push("")

  if (data.sms.needing_followup > 0) {
    const followups = data.sms.conversations.filter((c) => c.needs_followup)
    for (const conv of followups) {
      lines.push(
        `- **Lead ${conv.lead_id || "unknown"}** — ${conv.message_count} messages — *"${conv.latest_message}"* (${new Date(conv.latest_at).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" })} ET)`
      )
    }
  } else {
    lines.push("*No overnight messages need follow-up.*")
  }
  lines.push("")

  // ── Callbacks Section ──
  lines.push("## Today's Callbacks")
  if (data.callbacks.length === 0) {
    lines.push("*No callbacks scheduled for today.*")
  } else {
    lines.push(`**${data.callbacks.length}** scheduled:`)
    lines.push("")
    lines.push("| # | Business | Trade | Phone | Time | Notes |")
    lines.push("|---|----------|-------|-------|------|-------|")
    data.callbacks.forEach((cb, i) => {
      const timeStr = cb.scheduled_for
        ? new Date(cb.scheduled_for).toLocaleTimeString("en-US", {
            timeZone: "America/New_York",
            hour: "numeric",
            minute: "2-digit",
          })
        : "—"
      const notes = cb.notes ? cb.notes.split("\n").pop()?.slice(0, 60) || "—" : "—"
      lines.push(
        `| ${i + 1} | ${cb.business_name || "Unknown"} | ${cb.trade || "—"} | ${cb.phone || "—"} | ${timeStr} ET | ${notes} |`
      )
    })
  }
  lines.push("")

  // ── Pipeline Section ──
  lines.push("## Pipeline Status")
  const stageOrder = [
    "contacted",
    "interested",
    "demo_scheduled",
    "signed",
    "onboarding",
    "setup",
    "launch",
    "active",
  ]
  const totalClients = Object.values(data.pipeline).reduce((a, b) => a + b, 0)
  lines.push(`**${totalClients}** total active clients`)
  lines.push("")
  for (const stage of stageOrder) {
    const count = data.pipeline[stage] || 0
    const bar = "█".repeat(Math.min(count, 20))
    lines.push(`\`${stage.padEnd(14)}\`  ${String(count).padStart(3)}  ${bar}`)
  }
  // Any unrecognized stages
  for (const [stage, count] of Object.entries(data.pipeline)) {
    if (!stageOrder.includes(stage)) {
      lines.push(`\`${stage.padEnd(14)}\`  ${String(count).padStart(3)}`)
    }
  }
  lines.push("")

  // ── Yesterday's Calls Section ──
  lines.push("## Yesterday's Call Performance")
  const yc = data.yesterday_calls
  if (yc.total === 0) {
    lines.push("*No calls logged yesterday.*")
  } else {
    lines.push(`**${yc.total}** dials — **${yc.demo_rate}%** demo rate — **${yc.conversation_rate}%** conversation rate — **${yc.contact_rate}%** contact rate`)
    lines.push("")
    lines.push("**Dispositions:**")
    for (const [disposition, count] of Object.entries(yc.dispositions).sort(
      (a, b) => b[1] - a[1]
    )) {
      lines.push(`- ${disposition}: **${count}**`)
    }
  }
  lines.push("")

  // ── Stuck Onboarding ──
  lines.push("## Stuck in Onboarding (>3 days)")
  if (data.stuck_onboarding.length === 0) {
    lines.push("*No clients stuck in onboarding.*")
  } else {
    for (const client of data.stuck_onboarding) {
      lines.push(
        `- **${client.name || "Unknown"}** — stuck **${client.days_stuck}** days (status: ${client.onboarding_status || "—"})`
      )
    }
  }
  lines.push("")

  lines.push("---")
  lines.push(`*HomeField Hub Ops Intelligence | ${data.generated_at}*`)

  return lines.join("\n")
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function generateMorningBrief(): Promise<MorningBriefData> {
  const admin = getAdmin()

  console.log("[morning-brief] Fetching data...")

  const [smsMessages, callbacks, pipeline, yesterdayCalls, stuckOnboarding] =
    await Promise.all([
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

  const data: MorningBriefData = {
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

  return data
}

async function main() {
  try {
    const data = await generateMorningBrief()

    // Build markdown report
    const markdown = buildMarkdownReport(data)

    // Ensure output directory exists
    const reportsDir = path.join(process.cwd(), "docs", "ops-reports")
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    // Save both JSON and markdown
    const dateStr = data.report_date
    const jsonPath = path.join(reportsDir, `morning-${dateStr}.json`)
    const mdPath = path.join(reportsDir, `morning-${dateStr}.md`)

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2))
    fs.writeFileSync(mdPath, markdown)

    console.log(`[morning-brief] Report saved:`)
    console.log(`  JSON: ${jsonPath}`)
    console.log(`  Markdown: ${mdPath}`)
    console.log("")
    console.log("─".repeat(60))
    console.log(markdown)

    return data
  } catch (err) {
    console.error("[morning-brief] Fatal error:", err)
    process.exit(1)
  }
}

// Run if called directly
main()
