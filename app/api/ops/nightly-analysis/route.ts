/**
 * POST /api/ops/nightly-analysis
 * --------------------------------
 * Cron-triggered endpoint that runs the nightly cold call analysis.
 * Analyzes the day's calls, ranks hooks by performance, and posts a
 * summary to #daily-ops Slack channel.
 * Called by n8n at ~11:00 PM ET daily.
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

interface CallHistoryRow {
  id: string
  lead_id: string
  outcome: string
  notes: string | null
  call_date: string
  call_time: string
}

interface ProvenHook {
  id: string
  hook_text: string
  trade_vertical: string | null
  times_used: number
  conversations: number
  demos_booked: number
  demo_rate: number
  gatekeeper_pass_rate: number
  updated_at: string | null
}

interface NightlyAnalysisResult {
  report_date: string
  generated_at: string
  total_calls: number
  dispositions: Record<string, number>
  contact_rate_pct: number
  demo_rate_pct: number
  demos: number
  conversations: number
  top_hooks: Array<{
    hook_text: string
    demo_rate: number
    times_used: number
    demos_booked: number
    trade_vertical: string | null
  }>
  worst_hooks: Array<{
    hook_text: string
    demo_rate: number
    times_used: number
  }>
  recommendations: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, den: number): number {
  if (den === 0) return 0
  return Math.round((num / den) * 100)
}

function getTargetDate(): string {
  const now = new Date()
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  const y = et.getFullYear()
  const m = String(et.getMonth() + 1).padStart(2, "0")
  const d = String(et.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

async function runNightlyAnalysis(targetDate?: string): Promise<NightlyAnalysisResult> {
  const admin = getAdmin()
  const date = targetDate || getTargetDate()

  console.log(`[nightly-analysis/route] Running for date: ${date}`)

  // Fetch today's calls
  const { data: calls, error: callsErr } = await admin
    .from("dialer_call_history")
    .select("id, lead_id, outcome, notes, call_date, call_time")
    .eq("call_date", date)

  if (callsErr) {
    throw new Error(`Failed to fetch call history: ${callsErr.message}`)
  }

  const todayCalls: CallHistoryRow[] = calls ?? []
  const totalCalls = todayCalls.length

  // Disposition breakdown
  const dispositionMap: Record<string, number> = {}
  for (const call of todayCalls) {
    dispositionMap[call.outcome] = (dispositionMap[call.outcome] ?? 0) + 1
  }

  const conversations = dispositionMap["conversation"] ?? 0
  const demos = dispositionMap["demo_booked"] ?? 0
  const noAnswer = dispositionMap["no_answer"] ?? 0
  const voicemail = dispositionMap["voicemail"] ?? 0
  const notInterested = dispositionMap["not_interested"] ?? 0

  const contactRate = conversations + demos

  // Fetch proven hooks ranked by demo_rate
  const { data: hooks, error: hooksErr } = await admin
    .from("proven_hooks")
    .select("id, hook_text, trade_vertical, times_used, conversations, demos_booked, demo_rate, gatekeeper_pass_rate, updated_at")
    .order("demo_rate", { ascending: false })
    .limit(20)

  if (hooksErr) {
    console.warn("[nightly-analysis/route] Could not fetch proven_hooks:", hooksErr.message)
  }

  const rankedHooks: ProvenHook[] = hooks ?? []
  const qualifiedHooks = rankedHooks.filter((h) => h.times_used >= 3)
  const topHooks = qualifiedHooks.slice(0, 5)
  const worstHooks = [...qualifiedHooks]
    .sort((a, b) => a.demo_rate - b.demo_rate)
    .slice(0, 3)

  // Build recommendations
  const recommendations: string[] = []

  if (totalCalls === 0) {
    recommendations.push("No calls logged today. Check dialer and call_date formatting.")
  } else {
    if (demos === 0) {
      recommendations.push("No demos booked today. Focus on improving the opener — try a more pattern-interrupt hook.")
    } else {
      recommendations.push(`${demos} demo${demos > 1 ? "s" : ""} booked. Strong day.`)
    }
    if (totalCalls > 0 && contactRate / totalCalls < 0.1) {
      recommendations.push("Contact rate below 10%. Consider calling during 7:30-9:30 AM local time windows.")
    }
    if (voicemail > noAnswer) {
      recommendations.push("More voicemails than no-answers. Leaving messages costs time — consider skip voicemail on first pass.")
    }
    if (topHooks.length > 0) {
      recommendations.push(`Lead with the #1 opener: "${topHooks[0].hook_text.slice(0, 80)}"`)
    }
    if (notInterested > 0 && totalCalls > 0 && notInterested / totalCalls > 0.25) {
      recommendations.push(`High rejection rate (${pct(notInterested, totalCalls)}% not_interested). Script or targeting may need adjustment.`)
    }
  }

  return {
    report_date: date,
    generated_at: new Date().toISOString(),
    total_calls: totalCalls,
    dispositions: dispositionMap,
    contact_rate_pct: pct(contactRate, totalCalls),
    demo_rate_pct: pct(demos, totalCalls),
    demos,
    conversations,
    top_hooks: topHooks.map((h) => ({
      hook_text: h.hook_text,
      demo_rate: h.demo_rate,
      times_used: h.times_used,
      demos_booked: h.demos_booked,
      trade_vertical: h.trade_vertical,
    })),
    worst_hooks: worstHooks.map((h) => ({
      hook_text: h.hook_text,
      demo_rate: h.demo_rate,
      times_used: h.times_used,
    })),
    recommendations,
  }
}

// ─── Slack Poster ─────────────────────────────────────────────────────────────

async function postToSlack(data: NightlyAnalysisResult) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    console.warn("[nightly-analysis/route] SLACK_BOT_TOKEN not set — skipping Slack post")
    return null
  }

  type SlackBlock =
    | { type: "header"; text: { type: "plain_text"; text: string; emoji: boolean } }
    | { type: "section"; text: { type: "mrkdwn"; text: string }; fields?: Array<{ type: "mrkdwn"; text: string }> }
    | { type: "divider" }
    | { type: "context"; elements: Array<{ type: "mrkdwn"; text: string }> }

  const blocks: SlackBlock[] = []

  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: `Nightly Call Analysis — ${data.report_date}`,
      emoji: true,
    },
  })

  // Summary stats
  blocks.push({ type: "divider" })
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Summary*\n${data.total_calls} total calls · *${data.demos} demos* · ${data.demo_rate_pct}% demo rate · ${data.contact_rate_pct}% contact rate · ${data.conversations} conversations`,
    },
    fields: Object.entries(data.dispositions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([d, n]) => ({ type: "mrkdwn" as const, text: `*${d}:* ${n}` })),
  })

  // Top hooks
  if (data.top_hooks.length > 0) {
    blocks.push({ type: "divider" })
    const hooksText = data.top_hooks
      .slice(0, 3)
      .map((h, i) => `${i + 1}. _"${h.hook_text.slice(0, 70)}"_ — ${h.demo_rate}% demo rate (${h.times_used} uses, ${h.demos_booked} demos)`)
      .join("\n")
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Top Performing Openers*\n${hooksText}` },
    })
  }

  // Worst hooks
  if (data.worst_hooks.length > 0 && data.worst_hooks[0].demo_rate < (data.top_hooks[0]?.demo_rate ?? 100)) {
    const worstText = data.worst_hooks
      .map((h) => `• _"${h.hook_text.slice(0, 60)}"_ — ${h.demo_rate}% demo rate over ${h.times_used} uses`)
      .join("\n")
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: `*Underperformers:*\n${worstText}` }],
    })
  }

  // Recommendations
  if (data.recommendations.length > 0) {
    blocks.push({ type: "divider" })
    const recText = data.recommendations.map((r) => `• ${r}`).join("\n")
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Recommendations*\n${recText}` },
    })
  }

  // Footer
  blocks.push({ type: "divider" })
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `HomeField Hub — Cold Call War Room · <https://homefieldhub.com/portal/admin|Open Portal> · ${data.generated_at}`,
      },
    ],
  })

  const fallbackText = `Nightly Call Analysis — ${data.report_date}: ${data.total_calls} calls, ${data.demos} demos (${data.demo_rate_pct}% demo rate)`

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel: DAILY_OPS_CHANNEL, text: fallbackText, blocks }),
  })

  const result = (await res.json()) as { ok: boolean; error?: string; ts?: string }
  if (!result.ok) {
    console.error("[nightly-analysis/route] Slack post failed:", result.error)
    return null
  }

  return result
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// ─── Route Handlers ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return runHandler()
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Allow optional date override in body (for manual reruns)
  let targetDate: string | undefined
  try {
    const body = await req.json()
    if (body?.date && typeof body.date === "string") {
      targetDate = body.date
    }
  } catch {
    // no body or invalid JSON — use today
  }

  return runHandler(targetDate)
}

async function runHandler(targetDate?: string) {
  try {
    console.log("[api/ops/nightly-analysis] Starting nightly analysis...")
    const data = await runNightlyAnalysis(targetDate)

    console.log(`[api/ops/nightly-analysis] Analysis complete. ${data.total_calls} calls, ${data.demos} demos.`)

    const slackResult = await postToSlack(data)

    return NextResponse.json({
      status: "ok",
      slack_ts: slackResult?.ts ?? null,
      report_date: data.report_date,
      generated_at: data.generated_at,
      summary: {
        total_calls: data.total_calls,
        demos: data.demos,
        conversations: data.conversations,
        demo_rate_pct: data.demo_rate_pct,
        contact_rate_pct: data.contact_rate_pct,
        top_hooks_count: data.top_hooks.length,
        recommendations: data.recommendations,
      },
      data,
    })
  } catch (err) {
    console.error("[api/ops/nightly-analysis] Error:", err)
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    )
  }
}
