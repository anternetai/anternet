/**
 * POST /api/ops/post-morning-brief
 * ---------------------------------
 * Cron-triggered endpoint that generates the morning brief and posts it
 * to #daily-ops Slack channel using Block Kit formatting.
 * Called by n8n at ~7:15 AM ET daily (after morning-brief completes).
 *
 * Auth: x-cron-secret header must match CRON_SECRET env var.
 */

import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const DAILY_OPS_CHANNEL = "C0AHU0LBSSJ"

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

type SlackBlock =
  | { type: "header"; text: { type: "plain_text"; text: string; emoji: boolean } }
  | { type: "section"; text: { type: "mrkdwn"; text: string }; fields?: Array<{ type: "mrkdwn"; text: string }> }
  | { type: "divider" }
  | { type: "context"; elements: Array<{ type: "mrkdwn"; text: string }> }

// ─── Data Fetchers ────────────────────────────────────────────────────────────

async function fetchOvernightSms(admin: ReturnType<typeof getAdmin>) {
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from("sms_conversations")
    .select("id, lead_id, direction, body, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[post-morning-brief/route] SMS fetch error:", error.message)
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
    console.error("[post-morning-brief/route] Callbacks fetch error:", error.message)
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
    console.error("[post-morning-brief/route] Pipeline fetch error:", error.message)
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
    console.error("[post-morning-brief/route] Yesterday calls fetch error:", error.message)
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
    console.warn("[post-morning-brief/route] Stuck onboarding query failed:", error.message)
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

// ─── Slack Block Kit Builder ──────────────────────────────────────────────────

function buildSlackBlocks(data: MorningBriefData): SlackBlock[] {
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
      text: `Morning Brief — ${nowEt}`,
      emoji: true,
    },
  })

  // Pipeline Overview
  blocks.push({ type: "divider" })
  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: "*Pipeline Overview*" },
  })

  const stageOrder = ["contacted", "interested", "demo_scheduled", "signed", "onboarding", "active"] as const
  const pipelineFields: Array<{ type: "mrkdwn"; text: string }> = stageOrder.map((stage) => ({
    type: "mrkdwn" as const,
    text: `*${stage.replace(/_/g, " ")}:* ${data.pipeline[stage as keyof typeof data.pipeline] || 0}`,
  }))

  blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: " " },
    fields: pipelineFields,
  })

  // Yesterday's Calls
  blocks.push({ type: "divider" })
  const yc = data.yesterday_calls

  if (yc.total > 0) {
    const demos = yc.dispositions["demo_booked"] || 0
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Yesterday's Calls*\n${yc.total} dials · *${demos} demos* · ${yc.demo_rate}% demo rate · ${yc.conversation_rate}% conversation rate`,
      },
    })

    const topDisps = Object.entries(yc.dispositions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
    if (topDisps.length > 0) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: topDisps.map(([d, n]) => `${d}: ${n}`).join(" · ") }],
      })
    }
  } else {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*Yesterday's Calls*\n_No calls logged yesterday._" },
    })
  }

  // Today's Callbacks
  blocks.push({ type: "divider" })
  if (data.callbacks.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*Today's Callbacks*\n_No callbacks scheduled._" },
    })
  } else {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Today's Callbacks* — ${data.callbacks.length} scheduled` },
    })

    const cbList = data.callbacks
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

    if (data.callbacks.length > 5) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `_+${data.callbacks.length - 5} more callbacks in the portal_` }],
      })
    }
  }

  // Overnight SMS
  blocks.push({ type: "divider" })
  if (data.sms.total_overnight === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*Overnight SMS*\n_No overnight messages._" },
    })
  } else if (data.sms.needing_followup > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Overnight SMS* — ${data.sms.total_overnight} messages · :red_circle: *${data.sms.needing_followup} need follow-up*`,
      },
    })

    const followups = (data.sms.conversations as Array<{
      needs_followup?: boolean
      lead_id: string | null
      latest_message: string
      latest_at: string
    }>).filter((c) => c.needs_followup)

    if (followups.length > 0) {
      const followupText = followups
        .slice(0, 3)
        .map((c) => `• Lead ${c.lead_id || "unknown"} — _"${c.latest_message.slice(0, 80)}"_`)
        .join("\n")
      blocks.push({ type: "section", text: { type: "mrkdwn", text: followupText } })
    }
  } else {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Overnight SMS* — ${data.sms.total_overnight} messages · :white_check_mark: All caught up`,
      },
    })
  }

  // Stuck Onboarding
  if (data.stuck_onboarding.length > 0) {
    blocks.push({ type: "divider" })
    const stuckText = data.stuck_onboarding
      .map((c) => `• *${c.name || "Unknown"}* — stuck *${c.days_stuck}d* in onboarding`)
      .join("\n")
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Stuck in Onboarding*\n${stuckText}` },
    })
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

// ─── Slack Poster ─────────────────────────────────────────────────────────────

async function postToSlack(blocks: SlackBlock[], fallbackText: string) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN not set")
  }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: DAILY_OPS_CHANNEL,
      text: fallbackText,
      blocks,
    }),
  })

  const result = (await res.json()) as { ok: boolean; error?: string; ts?: string }

  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error}`)
  }

  return result
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const incomingSecret = req.headers.get("x-cron-secret")

  if (!cronSecret || incomingSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    console.log("[api/ops/post-morning-brief] Generating brief...")
    const data = await generateMorningBrief()

    console.log("[api/ops/post-morning-brief] Building Slack blocks...")
    const blocks = buildSlackBlocks(data)

    const fallbackText = [
      `Morning Brief — ${data.report_date}`,
      `Pipeline: ${Object.values(data.pipeline).reduce((a, b) => a + b, 0)} clients`,
      `Yesterday: ${data.yesterday_calls.total} calls / ${data.yesterday_calls.demo_rate}% demo rate`,
      `Today: ${data.callbacks.length} callbacks scheduled`,
      data.sms.needing_followup > 0
        ? `SMS: ${data.sms.needing_followup} messages need follow-up`
        : "SMS: All caught up",
    ].join(" · ")

    console.log("[api/ops/post-morning-brief] Posting to #daily-ops...")
    const result = await postToSlack(blocks, fallbackText)

    console.log(`[api/ops/post-morning-brief] Posted successfully (ts: ${result.ts})`)

    return NextResponse.json({
      status: "ok",
      slack_ts: result.ts,
      report_date: data.report_date,
      summary: {
        sms_overnight: data.sms.total_overnight,
        sms_needing_followup: data.sms.needing_followup,
        callbacks_today: data.callbacks.length,
        pipeline_total: Object.values(data.pipeline).reduce((a, b) => a + b, 0),
        yesterday_calls: data.yesterday_calls.total,
        yesterday_demo_rate: data.yesterday_calls.demo_rate,
      },
    })
  } catch (err) {
    console.error("[api/ops/post-morning-brief] Error:", err)
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    )
  }
}
