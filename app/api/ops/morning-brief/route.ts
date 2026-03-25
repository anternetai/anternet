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

import { generateMorningBrief } from "@/lib/ops/morning-brief-data"
import { NextRequest, NextResponse } from "next/server"

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
