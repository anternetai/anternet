/**
 * Evening Wrap Generator
 * ----------------------
 * Generates the end-of-day operations summary for HomeField Hub.
 *
 * Run with:
 *   npx tsx scripts/evening-wrap.ts
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

// ─── Data Fetchers ────────────────────────────────────────────────────────────

async function fetchTodayCalls(admin: ReturnType<typeof getAdmin>) {
  // Use ET midnight boundaries
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
    console.error("[evening-wrap] Today calls fetch error:", error.message)
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
    console.error("[evening-wrap] 7-day stats fetch error:", error.message)
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
    console.error("[evening-wrap] Tomorrow callbacks fetch error:", error.message)
    return []
  }

  return (data || []) as DialerLead[]
}

// ─── Analysis Functions ───────────────────────────────────────────────────────

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
  const contacts =
    conversations + (dispositions["callback"] || 0)

  return {
    total,
    dispositions,
    demo_rate: total > 0 ? Math.round((demos / total) * 1000) / 10 : 0,
    conversation_rate:
      total > 0 ? Math.round((conversations / total) * 1000) / 10 : 0,
    contact_rate:
      total > 0 ? Math.round((contacts / total) * 1000) / 10 : 0,
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
    demo_rate:
      totalDials > 0
        ? Math.round((totalDemos / totalDials) * 1000) / 10
        : 0,
    conversation_rate:
      totalDials > 0
        ? Math.round((totalConversations / totalDials) * 1000) / 10
        : 0,
  }
}

function detectAnomalies(
  today: EveningWrapData["today_calls"],
  avg: EveningWrapData["seven_day_avg"]
): EveningWrapData["anomalies"] {
  const anomalies: EveningWrapData["anomalies"] = []

  // Unusually low call volume
  if (avg.total_dials > 0 && today.total < avg.total_dials * 0.5) {
    anomalies.push({
      type: "low_volume",
      severity: "warning",
      message: `Only ${today.total} calls today vs ${avg.total_dials} daily avg — volume is down ${Math.round((1 - today.total / avg.total_dials) * 100)}%`,
    })
  }

  // Unusually high volume
  if (avg.total_dials > 0 && today.total > avg.total_dials * 1.5) {
    anomalies.push({
      type: "high_volume",
      severity: "info",
      message: `${today.total} calls today — ${Math.round((today.total / avg.total_dials - 1) * 100)}% above average. Great output!`,
    })
  }

  // Spike in not_interested
  const notInterested = today.dispositions["not_interested"] || 0
  const niRate = today.total > 0 ? notInterested / today.total : 0
  if (niRate > 0.25) {
    anomalies.push({
      type: "high_rejection",
      severity: "warning",
      message: `High rejection rate: ${Math.round(niRate * 100)}% not_interested — script or targeting may need adjustment`,
    })
  }

  // Demo rate dropped significantly
  if (avg.demo_rate > 0 && today.demo_rate < avg.demo_rate * 0.5) {
    anomalies.push({
      type: "low_demo_rate",
      severity: "warning",
      message: `Demo rate dropped to ${today.demo_rate}% vs ${avg.demo_rate}% avg — consider reviewing pitch`,
    })
  }

  // Great demo rate
  if (avg.demo_rate > 0 && today.demo_rate > avg.demo_rate * 1.5 && today.total > 10) {
    anomalies.push({
      type: "high_demo_rate",
      severity: "info",
      message: `Exceptional demo rate today: ${today.demo_rate}% vs ${avg.demo_rate}% avg — what worked today?`,
    })
  }

  // Zero calls logged
  if (today.total === 0) {
    anomalies.push({
      type: "no_calls",
      severity: "warning",
      message: "No calls logged today — was the dialer running?",
    })
  }

  return anomalies
}

function extractTopHooks(calls: CallHistory[]): TopHook[] {
  /**
   * "Hooks" are inferred from call notes — we look for opener/hook text patterns.
   * Since there's no dedicated proven_hooks table, we derive top hooks from
   * dialer_call_history notes by grouping on the first line of notes (the opener).
   *
   * Opener note format (from Cold Call Cockpit):
   *   "[Mar 12, 9:30 AM] conversation: Hey John, quick question..."
   *
   * We extract the text after the disposition label to find hook patterns.
   */

  const hookMap = new Map<
    string,
    { times_used: number; demos: number; conversations: number }
  >()

  for (const call of calls) {
    if (!call.notes) continue

    // Extract first note entry's text content
    const match = call.notes.match(/\[.*?\]\s*(?:conversation|demo_booked):\s*(.+)/i)
    if (!match) continue

    const hookText = match[1].slice(0, 100).trim()
    if (hookText.length < 10) continue

    const existing = hookMap.get(hookText) || {
      times_used: 0,
      demos: 0,
      conversations: 0,
    }
    existing.times_used++
    if (call.outcome === "demo_booked") existing.demos++
    if (["conversation", "demo_booked"].includes(call.outcome)) {
      existing.conversations++
    }
    hookMap.set(hookText, existing)
  }

  const hooks: TopHook[] = Array.from(hookMap.entries())
    .filter(([, stats]) => stats.times_used >= 2)
    .map(([text, stats]) => ({
      text,
      times_used: stats.times_used,
      demos: stats.demos,
      conversations: stats.conversations,
      demo_rate:
        stats.times_used > 0
          ? Math.round((stats.demos / stats.times_used) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.demo_rate - a.demo_rate || b.times_used - a.times_used)
    .slice(0, 5)

  return hooks
}

// ─── Markdown Builder ─────────────────────────────────────────────────────────

function buildMarkdownReport(data: EveningWrapData): string {
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

  lines.push(`# Evening Wrap — ${data.report_date}`)
  lines.push(`*Generated ${nowEt} ET*`)
  lines.push("")

  // ── Today's Numbers ──
  lines.push("## Today's Call Performance")
  const tc = data.today_calls
  if (tc.total === 0) {
    lines.push("*No calls logged today.*")
  } else {
    lines.push(`| Metric | Today | 7-Day Avg |`)
    lines.push(`|--------|-------|-----------|`)
    lines.push(`| Total Calls | **${tc.total}** | ${data.seven_day_avg.total_dials} |`)
    lines.push(`| Demo Rate | **${tc.demo_rate}%** | ${data.seven_day_avg.demo_rate}% |`)
    lines.push(`| Conversation Rate | **${tc.conversation_rate}%** | ${data.seven_day_avg.conversation_rate}% |`)
    lines.push(`| Contact Rate | **${tc.contact_rate}%** | — |`)
    lines.push(`| Gatekeeper Pass Rate | **${tc.gatekeeper_pass_rate}%** | — |`)
    lines.push("")
    lines.push("**Dispositions:**")
    for (const [disposition, count] of Object.entries(tc.dispositions).sort(
      (a, b) => b[1] - a[1]
    )) {
      const pct = Math.round((count / tc.total) * 100)
      lines.push(`- ${disposition}: **${count}** (${pct}%)`)
    }
  }
  lines.push("")

  // ── Anomalies ──
  if (data.anomalies.length > 0) {
    lines.push("## Anomalies & Flags")
    for (const anomaly of data.anomalies) {
      const icon =
        anomaly.severity === "critical"
          ? "🔴"
          : anomaly.severity === "warning"
          ? "⚠️"
          : "ℹ️"
      lines.push(`${icon} **${anomaly.type.replace(/_/g, " ").toUpperCase()}** — ${anomaly.message}`)
    }
    lines.push("")
  }

  // ── Top Hooks ──
  lines.push("## Top Hooks Today")
  if (data.top_hooks.length === 0) {
    lines.push(
      "*Not enough data to identify top hooks (need notes in call history).*"
    )
  } else {
    lines.push("| Opener | Demo Rate | Used | Demos |")
    lines.push("|--------|-----------|------|-------|")
    for (const hook of data.top_hooks) {
      lines.push(
        `| "${hook.text.slice(0, 60)}..." | ${hook.demo_rate}% | ${hook.times_used}x | ${hook.demos} |`
      )
    }
  }
  lines.push("")

  // ── Tomorrow's Callbacks ──
  lines.push("## Tomorrow's Priority Callbacks")
  if (data.tomorrow_callbacks.length === 0) {
    lines.push("*No callbacks scheduled for tomorrow yet.*")
  } else {
    lines.push(`**${data.tomorrow_callbacks.length}** callbacks queued:`)
    lines.push("")
    lines.push("| # | Business | Trade | Phone | Time |")
    lines.push("|---|----------|-------|-------|------|")
    data.tomorrow_callbacks.forEach((cb, i) => {
      const timeStr = cb.scheduled_for
        ? new Date(cb.scheduled_for).toLocaleTimeString("en-US", {
            timeZone: "America/New_York",
            hour: "numeric",
            minute: "2-digit",
          })
        : "—"
      lines.push(
        `| ${i + 1} | ${cb.business_name || "Unknown"} | ${cb.trade || "—"} | ${cb.phone || "—"} | ${timeStr} ET |`
      )
    })
  }
  lines.push("")

  lines.push("---")
  lines.push(`*HomeField Hub Ops Intelligence | ${data.generated_at}*`)

  return lines.join("\n")
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function generateEveningWrap(): Promise<EveningWrapData> {
  const admin = getAdmin()

  console.log("[evening-wrap] Fetching data...")

  const [todayCalls, sevenDayStats, tomorrowCallbacks] = await Promise.all([
    fetchTodayCalls(admin),
    fetchSevenDayStats(admin),
    fetchTomorrowCallbacks(admin),
  ])

  const callStats = computeCallStats(todayCalls)
  const sevenDayAvg = computeSevenDayAvg(sevenDayStats)
  const anomalies = detectAnomalies(callStats, sevenDayAvg)
  const topHooks = extractTopHooks(todayCalls)

  const nowEt = new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  const reportDate = new Date(nowEt).toISOString().split("T")[0]

  const data: EveningWrapData = {
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

  return data
}

async function main() {
  try {
    const data = await generateEveningWrap()
    const markdown = buildMarkdownReport(data)

    const reportsDir = path.join(process.cwd(), "docs", "ops-reports")
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    const dateStr = data.report_date
    const jsonPath = path.join(reportsDir, `evening-${dateStr}.json`)
    const mdPath = path.join(reportsDir, `evening-${dateStr}.md`)

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2))
    fs.writeFileSync(mdPath, markdown)

    console.log(`[evening-wrap] Report saved:`)
    console.log(`  JSON: ${jsonPath}`)
    console.log(`  Markdown: ${mdPath}`)
    console.log("")
    console.log("─".repeat(60))
    console.log(markdown)

    return data
  } catch (err) {
    console.error("[evening-wrap] Fatal error:", err)
    process.exit(1)
  }
}

main()
