/**
 * POST /api/ops/evening-wrap
 * ---------------------------
 * Cron-triggered endpoint that generates the evening wrap report and posts
 * it to #daily-ops Slack channel.
 * Called by n8n at ~6:00 PM ET daily.
 *
 * Auth: x-cron-secret header must match CRON_SECRET env var.
 */

import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { isAuthorized } from "@/lib/ops/cron-auth"

const DAILY_OPS_CHANNEL = "C0AHU0LBSSJ"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CallHistory {
  outcome: string
  created_at: string
  notes: string | null
  lead_id: string | null
}

interface DailyCallStats {
  call_date: string
  total_dials: number | null
  contacts: number | null
  conversations: number | null
  demos_booked: number | null
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

interface TopHook {
  text: string
  times_used: number
  demo_rate: number
  conversations: number
  demos: number
}

interface EveningWrapData {
  generated_at: string
  report_date: string
  today_calls: {
    total: number
    dispositions: Record<string, number>
    demo_rate: number
    conversation_rate: number
    contact_rate: number
    gatekeeper_pass_rate: number
  }
  seven_day_avg: {
    total_dials: number
    demo_rate: number
    conversation_rate: number
    demos_booked: number
  }
  anomalies: Array<{
    type: string
    severity: "info" | "warning" | "critical"
    message: string
  }>
  top_hooks: TopHook[]
  tomorrow_callbacks: Array<{
    id: string
    business_name: string | null
    trade: string | null
    phone: string | null
    scheduled_for: string | null
    notes: string | null
  }>
}

type SlackBlock =
  | { type: "header"; text: { type: "plain_text"; text: string; emoji: boolean } }
  | { type: "section"; text: { type: "mrkdwn"; text: string }; fields?: Array<{ type: "mrkdwn"; text: string }> }
  | { type: "divider" }
  | { type: "context"; elements: Array<{ type: "mrkdwn"; text: string }> }

// ─── Data Fetchers ────────────────────────────────────────────────────────────

async function fetchTodayCalls(admin: ReturnType<typeof getAdmin>) {
  const nowEt = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  )
  const dateStr = nowEt.toISOString().split("T")[0]

  const { data, error } = await admin
    .from("dialer_call_history")
    .select("outcome, created_at, notes, lead_id")
    .gte("created_at", `${dateStr}T00:00:00.000Z`)
    .lte("created_at", `${dateStr}T23:59:59.999Z`)

  if (error) {
    console.error("[evening-wrap/route] Today calls fetch error:", error.message)
    return []
  }
  return (data || []) as CallHistory[]
}

async function fetchSevenDayStats(admin: ReturnType<typeof getAdmin>) {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const dateStr = sevenDaysAgo.toISOString().split("T")[0]

  const { data, error } = await admin
    .from("daily_call_stats")
    .select("call_date, total_dials, contacts, conversations, demos_booked")
    .gte("call_date", dateStr)
    .order("call_date", { ascending: false })

  if (error) {
    console.error("[evening-wrap/route] 7-day stats fetch error:", error.message)
    return []
  }
  return (data || []) as DailyCallStats[]
}

async function fetchTomorrowCallbacks(admin: ReturnType<typeof getAdmin>) {
  const nowEt = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  )
  const tomorrow = new Date(nowEt)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const tomorrowEnd = new Date(tomorrow)
  tomorrowEnd.setHours(23, 59, 59, 999)

  const { data, error } = await admin
    .from("dialer_leads")
    .select("id, business_name, trade, phone_number, notes, next_call_at, state")
    .eq("status", "callback")
    .gte("next_call_at", tomorrow.toISOString())
    .lte("next_call_at", tomorrowEnd.toISOString())
    .order("next_call_at", { ascending: true })

  if (error) {
    console.error("[evening-wrap/route] Tomorrow callbacks fetch error:", error.message)
    return []
  }
  return (data || []) as DialerLead[]
}

async function fetchTopHooks(admin: ReturnType<typeof getAdmin>): Promise<TopHook[]> {
  const { data: hooks, error } = await admin
    .from("proven_hooks")
    .select("hook_text, times_used, conversations, demos_booked, demo_rate")
    .gte("times_used", 2)
    .order("demo_rate", { ascending: false })
    .limit(5)

  if (error) {
    console.warn("[evening-wrap/route] Could not fetch proven_hooks:", error.message)
    return []
  }

  return (hooks ?? []).map((h: Record<string, unknown>) => ({
    text: h.hook_text as string,
    times_used: h.times_used as number,
    demos: h.demos_booked as number,
    conversations: h.conversations as number,
    demo_rate: (h.demo_rate as number) ?? 0,
  }))
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function computeCallStats(calls: CallHistory[]) {
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
  const gatekeeperHits = dispositions["gatekeeper"] || 0
  const gatekeeperAttempts = gatekeeperHits + conversations
  const contacts = conversations + (dispositions["callback"] || 0)

  return {
    total,
    dispositions,
    demo_rate: total > 0 ? Math.round((demos / total) * 1000) / 10 : 0,
    conversation_rate: total > 0 ? Math.round((conversations / total) * 1000) / 10 : 0,
    contact_rate: total > 0 ? Math.round((contacts / total) * 1000) / 10 : 0,
    gatekeeper_pass_rate:
      gatekeeperAttempts > 0
        ? Math.round((conversations / gatekeeperAttempts) * 1000) / 10
        : 0,
  }
}

function computeSevenDayAvg(stats: DailyCallStats[]) {
  if (stats.length === 0) {
    return { total_dials: 0, demo_rate: 0, conversation_rate: 0, demos_booked: 0 }
  }

  const totalDials = stats.reduce((s, r) => s + (r.total_dials || 0), 0)
  const totalDemos = stats.reduce((s, r) => s + (r.demos_booked || 0), 0)
  const totalConversations = stats.reduce((s, r) => s + (r.conversations || 0), 0)
  const days = stats.length

  return {
    total_dials: Math.round(totalDials / days),
    demos_booked: Math.round(totalDemos / days),
    demo_rate: totalDials > 0 ? Math.round((totalDemos / totalDials) * 1000) / 10 : 0,
    conversation_rate: totalDials > 0 ? Math.round((totalConversations / totalDials) * 1000) / 10 : 0,
  }
}

function detectAnomalies(
  today: EveningWrapData["today_calls"],
  avg: EveningWrapData["seven_day_avg"]
): EveningWrapData["anomalies"] {
  const anomalies: EveningWrapData["anomalies"] = []

  if (avg.total_dials > 0 && today.total < avg.total_dials * 0.5) {
    anomalies.push({
      type: "low_volume",
      severity: "warning",
      message: `Only ${today.total} calls today vs ${avg.total_dials} daily avg — volume is down ${Math.round((1 - today.total / avg.total_dials) * 100)}%`,
    })
  }

  if (avg.total_dials > 0 && today.total > avg.total_dials * 1.5) {
    anomalies.push({
      type: "high_volume",
      severity: "info",
      message: `${today.total} calls today — ${Math.round((today.total / avg.total_dials - 1) * 100)}% above average. Great output!`,
    })
  }

  const notInterested = today.dispositions["not_interested"] || 0
  const niRate = today.total > 0 ? notInterested / today.total : 0
  if (niRate > 0.25) {
    anomalies.push({
      type: "high_rejection",
      severity: "warning",
      message: `High rejection rate: ${Math.round(niRate * 100)}% not_interested — script or targeting may need adjustment`,
    })
  }

  if (avg.demo_rate > 0 && today.demo_rate < avg.demo_rate * 0.5) {
    anomalies.push({
      type: "low_demo_rate",
      severity: "warning",
      message: `Demo rate dropped to ${today.demo_rate}% vs ${avg.demo_rate}% avg — consider reviewing pitch`,
    })
  }

  if (avg.demo_rate > 0 && today.demo_rate > avg.demo_rate * 1.5 && today.total > 10) {
    anomalies.push({
      type: "high_demo_rate",
      severity: "info",
      message: `Exceptional demo rate today: ${today.demo_rate}% vs ${avg.demo_rate}% avg — what worked today?`,
    })
  }

  if (today.total === 0) {
    anomalies.push({
      type: "no_calls",
      severity: "warning",
      message: "No calls logged today — was the dialer running?",
    })
  }

  return anomalies
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

async function generateEveningWrap(): Promise<EveningWrapData> {
  const admin = getAdmin()

  const [todayCalls, sevenDayStats, tomorrowCallbacks, topHooks] = await Promise.all([
    fetchTodayCalls(admin),
    fetchSevenDayStats(admin),
    fetchTomorrowCallbacks(admin),
    fetchTopHooks(admin),
  ])

  const callStats = computeCallStats(todayCalls)
  const sevenDayAvg = computeSevenDayAvg(sevenDayStats)
  const anomalies = detectAnomalies(callStats, sevenDayAvg)

  const nowEt = new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  const reportDate = new Date(nowEt).toISOString().split("T")[0]

  return {
    generated_at: new Date().toISOString(),
    report_date: reportDate,
    today_calls: callStats,
    seven_day_avg: sevenDayAvg,
    anomalies,
    top_hooks: topHooks,
    tomorrow_callbacks: tomorrowCallbacks.map((cb) => ({
      id: cb.id,
      business_name: cb.business_name,
      trade: cb.trade,
      phone: cb.phone_number,
      scheduled_for: cb.next_call_at,
      notes: cb.notes,
    })),
  }
}

// ─── Slack Block Kit Builder ──────────────────────────────────────────────────

function buildSlackBlocks(data: EveningWrapData): SlackBlock[] {
  const blocks: SlackBlock[] = []
  const nowEt = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: `Evening Wrap — ${nowEt}`,
      emoji: true,
    },
  })

  // Today's calls
  blocks.push({ type: "divider" })
  const tc = data.today_calls
  if (tc.total === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*Today's Calls*\n_No calls logged today._" },
    })
  } else {
    const demos = tc.dispositions["demo_booked"] || 0
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Today's Calls*\n${tc.total} dials · *${demos} demos* · ${tc.demo_rate}% demo rate · ${tc.conversation_rate}% conversation rate · ${tc.contact_rate}% contact rate`,
      },
      fields: [
        { type: "mrkdwn", text: `*7-day avg dials:* ${data.seven_day_avg.total_dials}` },
        { type: "mrkdwn", text: `*7-day avg demo rate:* ${data.seven_day_avg.demo_rate}%` },
        { type: "mrkdwn", text: `*Gatekeeper pass rate:* ${tc.gatekeeper_pass_rate}%` },
        { type: "mrkdwn", text: `*7-day conv rate:* ${data.seven_day_avg.conversation_rate}%` },
      ],
    })

    const topDisps = Object.entries(tc.dispositions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    if (topDisps.length > 0) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: topDisps.map(([d, n]) => `${d}: ${n}`).join(" · ") }],
      })
    }
  }

  // Anomalies
  if (data.anomalies.length > 0) {
    blocks.push({ type: "divider" })
    const anomalyText = data.anomalies
      .map((a) => {
        const icon = a.severity === "critical" ? ":red_circle:" : a.severity === "warning" ? ":warning:" : ":information_source:"
        return `${icon} *${a.type.replace(/_/g, " ").toUpperCase()}* — ${a.message}`
      })
      .join("\n")
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Anomalies & Flags*\n${anomalyText}` },
    })
  }

  // Top hooks
  if (data.top_hooks.length > 0) {
    blocks.push({ type: "divider" })
    const hooksText = data.top_hooks
      .slice(0, 3)
      .map((h, i) => `${i + 1}. _"${h.text.slice(0, 70)}"_ — ${h.demo_rate}% demo rate (${h.times_used} uses)`)
      .join("\n")
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Top Performing Openers*\n${hooksText}` },
    })
  }

  // Tomorrow's callbacks
  blocks.push({ type: "divider" })
  if (data.tomorrow_callbacks.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*Tomorrow's Callbacks*\n_No callbacks scheduled yet._" },
    })
  } else {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Tomorrow's Callbacks* — ${data.tomorrow_callbacks.length} queued` },
    })

    const cbList = data.tomorrow_callbacks
      .slice(0, 5)
      .map((cb) => {
        const timeStr = cb.scheduled_for
          ? new Date(cb.scheduled_for).toLocaleTimeString("en-US", {
              timeZone: "America/New_York",
              hour: "numeric",
              minute: "2-digit",
            })
          : "—"
        return `• *${cb.business_name || "Unknown"}* (${cb.trade || "??"}) — ${cb.phone || "—"} @ ${timeStr} ET`
      })
      .join("\n")

    blocks.push({ type: "section", text: { type: "mrkdwn", text: cbList } })
  }

  // Footer
  blocks.push({ type: "divider" })
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `HomeField Hub Ops Intelligence · <https://homefieldhub.com/portal/admin|Open Portal> · ${new Date().toISOString()}`,
      },
    ],
  })

  return blocks
}

async function postToSlack(blocks: SlackBlock[], fallbackText: string) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) throw new Error("SLACK_BOT_TOKEN not set")

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel: DAILY_OPS_CHANNEL, text: fallbackText, blocks }),
  })

  const result = (await res.json()) as { ok: boolean; error?: string; ts?: string }
  if (!result.ok) throw new Error(`Slack API error: ${result.error}`)
  return result
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// ─── Route Handlers ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return runEveningWrap()
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return runEveningWrap()
}

async function runEveningWrap() {
  try {
    console.log("[api/ops/evening-wrap] Generating evening wrap...")
    const data = await generateEveningWrap()

    console.log("[api/ops/evening-wrap] Building Slack blocks...")
    const blocks = buildSlackBlocks(data)

    const demos = data.today_calls.dispositions["demo_booked"] || 0
    const fallbackText = [
      `Evening Wrap — ${data.report_date}`,
      `Today: ${data.today_calls.total} calls / ${demos} demos / ${data.today_calls.demo_rate}% demo rate`,
      `Tomorrow: ${data.tomorrow_callbacks.length} callbacks`,
      data.anomalies.length > 0 ? `${data.anomalies.length} anomaly flags` : "No anomalies",
    ].join(" · ")

    console.log("[api/ops/evening-wrap] Posting to #daily-ops...")
    const result = await postToSlack(blocks, fallbackText)

    console.log(`[api/ops/evening-wrap] Posted successfully (ts: ${result.ts})`)

    return NextResponse.json({
      status: "ok",
      slack_ts: result.ts,
      report_date: data.report_date,
      summary: {
        total_calls: data.today_calls.total,
        demos: demos,
        demo_rate: data.today_calls.demo_rate,
        anomalies: data.anomalies.length,
        tomorrow_callbacks: data.tomorrow_callbacks.length,
      },
    })
  } catch (err) {
    console.error("[api/ops/evening-wrap] Error:", err)
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    )
  }
}
