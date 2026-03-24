/**
 * GET /api/ops/dashboard
 * ----------------------
 * Real-time operational metrics for HomeField Hub.
 * Admin-only endpoint — requires authenticated admin session.
 *
 * Returns today's call stats, pipeline counts, active alerts,
 * and top hooks derived from call history notes.
 */

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const ADMIN_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardAlert {
  type: string
  severity: "info" | "warning" | "critical"
  message: string
}

interface TopHook {
  text: string
  demo_rate: number
  times_used: number
}

interface DashboardResponse {
  today: {
    calls_made: number
    demos_booked: number
    conversations: number
    demo_rate: number
    callbacks_remaining: number
  }
  pipeline: {
    contacted: number
    interested: number
    demo_scheduled: number
    signed: number
    onboarding: number
    setup: number
    launch: number
    active: number
  }
  alerts: DashboardAlert[]
  top_hooks: TopHook[]
  generated_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function etDateString(): string {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  )
    .toISOString()
    .split("T")[0]
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET() {
  // Auth check — admin only
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()

  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = getAdmin()
  const today = etDateString()
  const nowIso = new Date().toISOString()

  // ── Parallel data fetch ──────────────────────────────────────────────────────
  const [
    callHistoryResult,
    pipelineResult,
    callbacksResult,
    stuckOnboardingResult,
    overdueCallbacksResult,
  ] = await Promise.all([
    // Today's calls
    admin
      .from("dialer_call_history")
      .select("outcome, notes, created_at")
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lte("created_at", `${today}T23:59:59.999Z`),

    // Pipeline counts (exclude admin account)
    admin
      .from("agency_clients")
      .select("pipeline_stage")
      .is("deleted_at", null)
      .neq("auth_user_id", ADMIN_ID),

    // Callbacks remaining today
    admin
      .from("dialer_leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "callback")
      .gte("next_call_at", `${today}T00:00:00.000Z`)
      .lte("next_call_at", `${today}T23:59:59.999Z`),

    // Stuck in onboarding >3 days
    admin
      .from("agency_clients")
      .select("id, legal_business_name, pipeline_stage_changed_at")
      .eq("pipeline_stage", "onboarding")
      .is("deleted_at", null)
      .neq("auth_user_id", ADMIN_ID)
      .lt(
        "pipeline_stage_changed_at",
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      ),

    // Overdue callbacks (scheduled before now, still status=callback)
    admin
      .from("dialer_leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "callback")
      .lt("next_call_at", nowIso)
      .gte(
        "next_call_at",
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      ),
  ])

  // ── Process call stats ───────────────────────────────────────────────────────
  const calls = callHistoryResult.data || []
  const totalCalls = calls.length
  const demos = calls.filter((c) => c.outcome === "demo_booked").length
  const conversations = calls.filter((c) =>
    ["conversation", "demo_booked", "not_interested", "wrong_number"].includes(
      c.outcome
    )
  ).length

  const demoRate =
    totalCalls > 0 ? Math.round((demos / totalCalls) * 1000) / 10 : 0

  // ── Process pipeline ─────────────────────────────────────────────────────────
  const pipelineRows = pipelineResult.data || []
  const pipeline = {
    contacted: 0,
    interested: 0,
    demo_scheduled: 0,
    signed: 0,
    onboarding: 0,
    setup: 0,
    launch: 0,
    active: 0,
  }

  for (const row of pipelineRows) {
    const stage = row.pipeline_stage as keyof typeof pipeline
    if (stage in pipeline) {
      pipeline[stage]++
    }
  }

  // ── Build alerts ─────────────────────────────────────────────────────────────
  const alerts: DashboardAlert[] = []

  // Overdue callbacks
  const overdueCount = overdueCallbacksResult.count || 0
  if (overdueCount > 0) {
    alerts.push({
      type: "overdue_callback",
      severity: overdueCount > 5 ? "warning" : "info",
      message: `${overdueCount} callback${overdueCount === 1 ? "" : "s"} overdue from the last 2 days`,
    })
  }

  // Stuck onboarding clients
  const stuckClients = stuckOnboardingResult.data || []
  for (const client of stuckClients) {
    const updatedAt = client.pipeline_stage_changed_at
      ? new Date(client.pipeline_stage_changed_at)
      : new Date(0)
    const daysStuck = Math.floor(
      (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    alerts.push({
      type: "stuck_onboarding",
      severity: daysStuck > 7 ? "warning" : "info",
      message: `${client.legal_business_name || "Unknown client"} in onboarding for ${daysStuck} day${daysStuck === 1 ? "" : "s"}`,
    })
  }

  // Low call volume warning (if past 2pm ET and fewer than 30 calls)
  const etHour = parseInt(
    new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    })
  )
  if (etHour >= 14 && totalCalls < 30 && totalCalls > 0) {
    alerts.push({
      type: "low_volume",
      severity: "info",
      message: `Only ${totalCalls} calls so far today — push through the afternoon`,
    })
  }

  if (etHour >= 16 && totalCalls === 0) {
    alerts.push({
      type: "no_calls_today",
      severity: "warning",
      message: "No calls logged today — was the dialer active?",
    })
  }

  // ── Top hooks from today's notes ─────────────────────────────────────────────
  const hookMap = new Map<string, { times_used: number; demos: number }>()

  for (const call of calls) {
    if (!call.notes) continue
    const match = call.notes.match(
      /\[.*?\]\s*(?:conversation|demo_booked):\s*(.+)/i
    )
    if (!match) continue
    const text = match[1].slice(0, 100).trim()
    if (text.length < 10) continue

    const existing = hookMap.get(text) || { times_used: 0, demos: 0 }
    existing.times_used++
    if (call.outcome === "demo_booked") existing.demos++
    hookMap.set(text, existing)
  }

  const topHooks: TopHook[] = Array.from(hookMap.entries())
    .filter(([, s]) => s.times_used >= 2)
    .map(([text, s]) => ({
      text,
      times_used: s.times_used,
      demo_rate:
        s.times_used > 0
          ? Math.round((s.demos / s.times_used) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.demo_rate - a.demo_rate || b.times_used - a.times_used)
    .slice(0, 5)

  // ── Assemble response ─────────────────────────────────────────────────────────
  const response: DashboardResponse = {
    today: {
      calls_made: totalCalls,
      demos_booked: demos,
      conversations,
      demo_rate: demoRate,
      callbacks_remaining: callbacksResult.count || 0,
    },
    pipeline,
    alerts,
    top_hooks: topHooks,
    generated_at: nowIso,
  }

  return NextResponse.json(response, {
    headers: {
      // Short cache — fresh enough for a dashboard
      "Cache-Control": "private, max-age=60, stale-while-revalidate=30",
    },
  })
}
