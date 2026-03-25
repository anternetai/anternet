/**
 * POST /api/ops/post-morning-brief
 * ---------------------------------
 * Cron-triggered endpoint that generates the morning brief and posts it
 * to #daily-ops Slack channel using Block Kit formatting.
 * Called by n8n at ~7:15 AM ET daily (after morning-brief completes).
 *
 * Auth: x-cron-secret header must match CRON_SECRET env var.
 */

import { generateMorningBrief, type MorningBriefData } from "@/lib/ops/morning-brief-data"
import { NextRequest, NextResponse } from "next/server"

const DAILY_OPS_CHANNEL = "C0AHU0LBSSJ"

// ─── Types ────────────────────────────────────────────────────────────────────

type SlackBlock =
  | { type: "header"; text: { type: "plain_text"; text: string; emoji: boolean } }
  | { type: "section"; text: { type: "mrkdwn"; text: string }; fields?: Array<{ type: "mrkdwn"; text: string }> }
  | { type: "divider" }
  | { type: "context"; elements: Array<{ type: "mrkdwn"; text: string }> }

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

    const followups = data.sms.conversations.filter((c) => c.needs_followup)

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
