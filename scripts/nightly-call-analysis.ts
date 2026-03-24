#!/usr/bin/env npx ts-node --project tsconfig.node.json
/**
 * nightly-call-analysis.ts
 *
 * Runs nightly (via cron / Windows Task Scheduler) to analyze the day's calls,
 * rank hooks by performance, and save a markdown report to
 * docs/cold-call-reports/[date].md
 *
 * Usage:
 *   npx ts-node scripts/nightly-call-analysis.ts
 *   npx ts-node scripts/nightly-call-analysis.ts --date 2026-03-24
 *
 * Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js"
import * as fs from "fs"
import * as path from "path"

// ─── Config ───────────────────────────────────────────────────────────────────

// Load .env.local manually since we're outside Next.js
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, den: number): string {
  if (den === 0) return "0%"
  return `${Math.round((num / den) * 100)}%`
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function getTargetDate(): string {
  const args = process.argv.slice(2)
  const dateFlag = args.find((a) => a.startsWith("--date=") || a === "--date")
  if (dateFlag) {
    const idx = args.indexOf("--date")
    if (idx !== -1 && args[idx + 1]) return args[idx + 1]
    return dateFlag.replace("--date=", "")
  }
  // Default: today in ET
  const now = new Date()
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  return `${et.getFullYear()}-${pad(et.getMonth() + 1)}-${pad(et.getDate())}`
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const targetDate = getTargetDate()
  console.log(`[nightly-call-analysis] Running for date: ${targetDate}`)

  // ── 1. Fetch today's calls ────────────────────────────────────────────────
  const { data: calls, error: callsErr } = await supabase
    .from("dialer_call_history")
    .select("id, lead_id, outcome, notes, call_date, call_time")
    .eq("call_date", targetDate)

  if (callsErr) {
    console.error("Failed to fetch call history:", callsErr)
    process.exit(1)
  }

  const todayCalls: CallHistoryRow[] = calls ?? []
  const totalCalls = todayCalls.length

  // ── 2. Disposition breakdown ──────────────────────────────────────────────
  const dispositionMap: Record<string, number> = {}
  for (const call of todayCalls) {
    dispositionMap[call.outcome] = (dispositionMap[call.outcome] ?? 0) + 1
  }

  const conversations = dispositionMap["conversation"] ?? 0
  const demos = dispositionMap["demo_booked"] ?? 0
  const noAnswer = dispositionMap["no_answer"] ?? 0
  const voicemail = dispositionMap["voicemail"] ?? 0
  const gatekeeper = dispositionMap["gatekeeper"] ?? 0
  const notInterested = dispositionMap["not_interested"] ?? 0
  const callbacks = dispositionMap["callback"] ?? 0
  const wrongNumber = dispositionMap["wrong_number"] ?? 0

  const contactRate = conversations + demos
  const demoRate = demos

  // ── 3. Fetch proven_hooks ranked by demo_rate ─────────────────────────────
  const { data: hooks, error: hooksErr } = await supabase
    .from("proven_hooks")
    .select("id, hook_text, trade_vertical, times_used, conversations, demos_booked, demo_rate, gatekeeper_pass_rate, updated_at")
    .order("demo_rate", { ascending: false })
    .limit(20)

  if (hooksErr) {
    console.warn("Could not fetch proven_hooks:", hooksErr.message)
  }

  const rankedHooks: ProvenHook[] = hooks ?? []

  const topHooks = rankedHooks.filter((h) => h.times_used >= 3).slice(0, 5)
  const worstHooks = [...rankedHooks]
    .filter((h) => h.times_used >= 3)
    .sort((a, b) => a.demo_rate - b.demo_rate)
    .slice(0, 3)

  // ── 4. Build markdown report ──────────────────────────────────────────────

  const lines: string[] = []

  lines.push(`# Cold Call Report — ${targetDate}`)
  lines.push(``)
  lines.push(`_Generated by nightly-call-analysis.ts at ${new Date().toISOString()}_`)
  lines.push(``)

  // Summary
  lines.push(`## Summary`)
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Total Calls | ${totalCalls} |`)
  lines.push(`| Contact Rate | ${pct(contactRate, totalCalls)} (${contactRate}/${totalCalls}) |`)
  lines.push(`| Demo Rate | ${pct(demoRate, totalCalls)} (${demoRate}/${totalCalls}) |`)
  lines.push(`| Demos Booked | ${demos} |`)
  lines.push(`| Conversations | ${conversations} |`)
  lines.push(``)

  // Disposition breakdown
  lines.push(`## Disposition Breakdown`)
  lines.push(``)
  lines.push(`| Disposition | Count | % of Calls |`)
  lines.push(`|-------------|-------|------------|`)

  const dispositions = [
    ["demo_booked", demos],
    ["conversation", conversations],
    ["callback", callbacks],
    ["voicemail", voicemail],
    ["gatekeeper", gatekeeper],
    ["no_answer", noAnswer],
    ["not_interested", notInterested],
    ["wrong_number", wrongNumber],
  ] as [string, number][]

  for (const [label, count] of dispositions) {
    if (count > 0) {
      lines.push(`| ${label} | ${count} | ${pct(count, totalCalls)} |`)
    }
  }
  lines.push(``)

  // Top performing hooks
  lines.push(`## Top Performing Openers`)
  lines.push(``)
  if (topHooks.length === 0) {
    lines.push(`_No hooks with 3+ uses yet. Keep dialing._`)
  } else {
    for (let i = 0; i < topHooks.length; i++) {
      const h = topHooks[i]
      lines.push(`### ${i + 1}. ${h.hook_text.slice(0, 80)}${h.hook_text.length > 80 ? "..." : ""}`)
      lines.push(``)
      lines.push(`- **Demo Rate:** ${pct(h.demos_booked, h.times_used)} (${h.demos_booked}/${h.times_used})`)
      lines.push(`- **Conversation Rate:** ${pct(h.conversations, h.times_used)}`)
      if (h.trade_vertical) lines.push(`- **Trade:** ${h.trade_vertical}`)
      lines.push(``)
      lines.push(`> ${h.hook_text}`)
      lines.push(``)
    }
  }

  // Worst performing hooks
  if (worstHooks.length > 0) {
    lines.push(`## Underperforming Openers (Cut or Rework)`)
    lines.push(``)
    for (const h of worstHooks) {
      lines.push(`- **"${h.hook_text.slice(0, 60)}..."** — Demo rate: ${pct(h.demos_booked, h.times_used)} over ${h.times_used} uses`)
    }
    lines.push(``)
  }

  // Recommendations
  lines.push(`## Recommendations`)
  lines.push(``)

  if (totalCalls === 0) {
    lines.push(`- No calls logged today. Check dialer and call_date formatting.`)
  } else {
    if (demos === 0) {
      lines.push(`- No demos booked today. Focus on improving the opener — try a more pattern-interrupt hook.`)
    } else {
      lines.push(`- ${demos} demo${demos > 1 ? "s" : ""} booked. Strong day.`)
    }
    if (contactRate / totalCalls < 0.1) {
      lines.push(`- Contact rate below 10%. Consider calling during 7:30-9:30 AM local time windows.`)
    }
    if (voicemail > noAnswer) {
      lines.push(`- More voicemails than no-answers. Leaving messages costs time — consider skip voicemail on first pass.`)
    }
    if (topHooks.length > 0) {
      lines.push(`- Lead with the #1 opener: _"${topHooks[0].hook_text.slice(0, 80)}"_`)
    }
  }

  lines.push(``)
  lines.push(`---`)
  lines.push(`_HomeField Hub — Cold Call War Room_`)

  const report = lines.join("\n")

  // ── 5. Save report ────────────────────────────────────────────────────────
  const reportsDir = path.join(__dirname, "..", "docs", "cold-call-reports")
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  const outPath = path.join(reportsDir, `${targetDate}.md`)
  fs.writeFileSync(outPath, report, "utf-8")

  console.log(`[nightly-call-analysis] Report saved to: ${outPath}`)
  console.log(`[nightly-call-analysis] Summary: ${totalCalls} calls, ${demos} demos, ${conversations} conversations`)
}

run().catch((err) => {
  console.error("[nightly-call-analysis] Fatal error:", err)
  process.exit(1)
})
